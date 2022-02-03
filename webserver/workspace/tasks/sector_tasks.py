from webserver.celery import celery_app as app
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
from functools import partial


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


@app.task
def calculateSectorViewshed(sector_id: str):
    sector, created = workspace_models.AccessPointSector.objects.get_or_create(uuid=sector_id)
    cached = sector.viewshed.result_cached()
    sector.viewshed.on_task_start(current_task.request.id)

    try:
        assert sector.viewshed is not None
    except workspace_models.Viewshed.DoesNotExist:
        workspace_models.Viewshed(sector=sector).save()
        TASK_LOGGER.info("created new viewshed object")
    if not cached:
        if not created:
            sector.viewshed.delete_tiles()
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
    else:
        TASK_LOGGER.info("cache hit on viewshed result")

    sector.viewshed.progress_message = None
    sector.viewshed.time_remaining = None
    sector.viewshed.save()

    app.send_task("workspace.tasks.sector_tasks.calculateSectorNearby", (sector.uuid,))


@app.task
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
        building_coverage.nearby_buildings.clear()
        # Find all buildings that intersect
        offset = 0
        remaining_buildings = True
        while remaining_buildings:
            buildings = gis_data_models.MsftBuildingOutlines.objects.filter(
                geog__intersects=sector.geojson
            ).all()[offset: BUILDING_PAGINATION + offset]
            nearby_buildings = []
            for building in buildings:
                b = workspace_models.BuildingCoverage(msftid=building.id)
                b.save()
                building_coverage.nearby_buildings.add(b)
                nearby_buildings.append(b)
            building_coverage.save()

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
            for idx, building in enumerate(coverage.nearby_buildings.all()):
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
