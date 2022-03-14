from celery_async import celery_app as app
from workspace import models as workspace_models
from gis_data import models as gis_data_models

from celery import current_task
from celery.utils.log import get_task_logger
from workspace.tasks.websocket_utils import sendMessageToChannel
import tempfile
import rasterio
from rasterio import mask
from shapely import wkt
import numpy as np
from django.contrib.gis.geos import Point
from functools import partial, wraps


TASK_LOGGER = get_task_logger(__name__)

BUILDING_PAGINATION = 10000
VISIBLE_PIXEL_VALUE = 255


def _update_status(sector_id, msg, time_remaining):
    resp = {
        "type": "ap.viewshed_progress",
        "progress": msg,
        "time_remaining": time_remaining,
        "uuid": sector_id,
    }
    sector = workspace_models.AccessPointSector.objects.get(uuid=sector_id)
    network_id = str(sector.map_session.pk)
    sector.viewshed.progress_message = msg
    sector.viewshed.time_remaining = time_remaining
    sector.viewshed.save()
    sendMessageToChannel(network_id, resp)


def _sector_task(error_log_msg):
    def decorator(func):
        @wraps(func)
        def wrapped(sector_id):
            try:
                func(sector_id)
            except Exception as e:
                TASK_LOGGER.error(error_log_msg)

                # notify client of failure
                _update_status(sector_id, "Task Failed", None)

                # raise exception so that job may be marked as failure
                raise e

        return wrapped

    return decorator


@app.task
@_sector_task("Unexpected sector viewshed calculation failure")
def calculateSectorViewshed(sector_id: str):
    sector = workspace_models.AccessPointSector.objects.get(uuid=sector_id)

    # Check the hash to determine if we need to run
    try:
        cached = sector.viewshed.result_cached()
        if cached:
            TASK_LOGGER.info("cache hit on viewshed result")
            return
        else:
            raise workspace_models.Viewshed.DoesNotExist
    except workspace_models.Viewshed.DoesNotExist:
        TASK_LOGGER.info("cache miss on viewshed result")
        pass

    try:
        sector.refresh_from_db()
        sector.viewshed.cancel_task()
        # Delete old viewshed to avoid get dirty cache keys on old uuid tile keys
        sector.viewshed.delete()
        workspace_models.Viewshed(sector=sector).save()
    except workspace_models.Viewshed.DoesNotExist:
        workspace_models.Viewshed(sector=sector).save()
        TASK_LOGGER.info("created new viewshed object")

    try:
        sector.refresh_from_db()
        sector.building_coverage.cancel_task()
        sector.building_coverage.delete()
        workspace_models.AccessPointCoverageBuildings(sector=sector).save()
    except workspace_models.AccessPointCoverageBuildings.DoesNotExist:
        workspace_models.AccessPointCoverageBuildings(sector=sector).save()
        TASK_LOGGER.info("created new building coverage object")

    sector.refresh_from_db()
    sector.viewshed.on_task_start(current_task.request.id)
    sector.viewshed.calculateViewshed(partial(_update_status, sector_id))

    # Notify Websockets listening to session
    resp = {
        "type": "ap.viewshed",
        "base_url": sector.viewshed.getBaseTileSetUrl(),
        "maxzoom": sector.viewshed.max_zoom,
        "minzoom": sector.viewshed.min_zoom,
        "uuid": str(sector.pk),
    }
    sendMessageToChannel(str(sector.map_session.pk), resp)

    sector.viewshed.progress_message = None
    sector.viewshed.time_remaining = None
    sector.viewshed.save()

    app.send_task("workspace.tasks.sector_tasks.calculateSectorNearby", (sector.uuid,))


@app.task
@_sector_task("Unexpected sector building coverage calculation failure")
def calculateSectorNearby(sector_id: str):
    sector = workspace_models.AccessPointSector.objects.get(uuid=sector_id)
    (
        building_coverage,
        _,
    ) = workspace_models.AccessPointCoverageBuildings.objects.get_or_create(
        sector=sector
    )

    cached = building_coverage.result_cached()
    building_coverage.on_task_start(current_task.request.id)
    if not cached:
        building_coverage.buildingcoverage_set.all().delete()
        # Find all buildings that intersect
        offset = 0
        remaining_buildings = True
        while remaining_buildings:
            buildings = gis_data_models.MsftBuildingOutlines.objects.filter(
                geog__intersects=sector.geojson
            ).all()[offset: BUILDING_PAGINATION + offset]
            nearby_buildings = []
            for building in buildings:
                b = workspace_models.BuildingCoverage(coverage=building_coverage, msftid=building.id)
                nearby_buildings.append(b)
            workspace_models.BuildingCoverage.objects.bulk_create(nearby_buildings)

            offset = offset + BUILDING_PAGINATION
            remaining_buildings = len(buildings) > 0

            # notify client that we have gathered some of the buildings
            update = {
                "type": "ap.status",
                "status": building_coverage.status,
                "uuid": str(sector.uuid),
            }
            sendMessageToChannel(str(sector.map_session.pk), update)
    else:
        TASK_LOGGER.info("cache hit building coverage")

    # notify client that we have gathered all the buildings
    update = {
        "type": "ap.status",
        "status": building_coverage.status,
        "uuid": str(sector.uuid),
    }
    sendMessageToChannel(str(sector.map_session.pk), update)

    # Start caculating coverage
    calculateSectorCoverage(sector, building_coverage)


def calculateSectorCoverage(
    sector: workspace_models.AccessPointSector,
    coverage: workspace_models.AccessPointCoverageBuildings,
):
    viewshed = sector.viewshed
    # Load Up Coverage
    with tempfile.NamedTemporaryFile(suffix=".tif") as fp:
        viewshed.read_object(fp, tif=True)
        with rasterio.open(fp.name) as ds:
            # Check Building Coverage
            for idx, building in enumerate(coverage.buildingcoverage_set.all()):
                # Determine if Any areas are not obstructed
                building_polygon = (
                    building.geog
                    if building.geog
                    else gis_data_models.MsftBuildingOutlines.objects.get(
                        id=building.msftid
                    ).geog
                )
                building_polygon = wkt.loads(building_polygon.wkt)
                if building_polygon:
                    nodata = None
                    if viewshed.mode == workspace_models.Viewshed.CoverageStatus.GROUND:
                        nodata = np.Inf
                    out_image, out_transform = mask.mask(
                        ds, [building_polygon], nodata=nodata, crop=True
                    )
                    # Find the highest point in the cropped image and make that the recommended
                    # installation location for the CPE
                    cpe_location = np.argmax(out_image)
                    if viewshed.mode == workspace_models.Viewshed.CoverageStatus.GROUND:
                        cpe_location = np.argmin(out_image)
                    _, max_index_i, max_index_j = np.unravel_index(
                        cpe_location, out_image.shape
                    )
                    # Update Serviceability and Best CPE location
                    if viewshed.mode == workspace_models.Viewshed.CoverageStatus.GROUND:
                        serviceable = (
                            np.logical_and(
                                out_image < sector.default_cpe_height,
                                out_image != np.Inf,
                            )
                        ).any()
                    if viewshed.mode == workspace_models.Viewshed.CoverageStatus.NORMAL:
                        serviceable = (out_image == VISIBLE_PIXEL_VALUE).any()
                    if serviceable:
                        building.status = (
                            workspace_models.BuildingCoverage.CoverageStatus.SERVICEABLE
                        )
                    else:
                        building.status = (
                            workspace_models.BuildingCoverage.CoverageStatus.UNSERVICEABLE
                        )
                    if serviceable:
                        loc = rasterio.transform.xy(
                            out_transform, max_index_i, max_index_j
                        )
                        building.cpe_location = Point(*loc)
                    building.save(update_fields=["status", "cpe_location"])
                if idx % BUILDING_PAGINATION == 0:
                    update = {
                        "type": "ap.status",
                        "status": coverage.status,
                        "uuid": str(sector.uuid),
                    }
                    sendMessageToChannel(str(sector.map_session.pk), update)
    update = {"type": "ap.status", "status": coverage.status, "uuid": str(sector.uuid)}
    sendMessageToChannel(str(sector.map_session.pk), update)
