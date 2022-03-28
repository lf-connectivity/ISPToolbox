from celery import current_task
from celery.utils.log import get_task_logger
from workspace.models import (
    AccessPointLocation,
    AccessPointCoverageBuildings,
    BuildingCoverage,
)
from gis_data.models import MsftBuildingOutlines
from django.contrib.gis.geos import GEOSGeometry, LineString
from mmwave.lidar_utils.LidarEngine import LidarEngine, LidarResolution
from workspace.utils.geojson_circle import createGeoJSONCircle
from workspace.tasks.websocket_utils import updateClientAPStatus

import numpy as np
import json
from celery_async import celery_app as app


ARC_SECOND_DEGREES = 1.0 / 60.0 / 60.0
LIMIT_BUILDINGS = 10000
INTERVAL_UPDATE_FRONTEND = 10
TASK_LOGGER = get_task_logger(__name__)


@app.task
def generateAccessPointCoverage(channel_id, request, user_id=None):
    """
    Calculate the coverage area of an access point location
    """
    ap = AccessPointLocation.objects.get(uuid=request["uuid"])

    building_coverage, created = AccessPointCoverageBuildings.objects.get_or_create(
        ap=ap
    )
    if created:
        building_coverage.save()
        cached = False
    else:
        cached = building_coverage.result_cached()
        building_coverage.on_task_start(current_task.request.id)

    # check if the result exists already
    if not cached:
        TASK_LOGGER.info("cache miss building coverage")
        new_hash = building_coverage.calculate_hash()
        # Get circle geometry
        circle_json = json.dumps(
            createGeoJSONCircle(
                building_coverage.ap.geojson, building_coverage.ap.max_radius
            )
        )
        circle = GEOSGeometry(circle_json)

        # Find all buildings that intersect the access point radius
        buildings = MsftBuildingOutlines.objects.filter(geog__intersects=circle).all()[
            0:LIMIT_BUILDINGS
        ]
        building_coverage.buildingcoverage_set.all().delete()
        nearby_buildings = []
        for building in buildings:
            b = BuildingCoverage(coverage=building_coverage, msftid=building.id)
            nearby_buildings.append(b)
        BuildingCoverage.objects.bulk_create(nearby_buildings)

        building_coverage.status = (
            AccessPointCoverageBuildings.CoverageCalculationStatus.COMPLETE.value
        )
        building_coverage.hash = new_hash
        building_coverage.save()
    else:
        TASK_LOGGER.info("cache hit building coverage")

    updateClientAPStatus(channel_id, ap.uuid, user_id)


def checkBuildingServiceable(access_point, building):
    """
    Helper function, loads up lidar profile between centroid of building and accesspoint, calculates if link is feasible

    """
    building = MsftBuildingOutlines.objects.filter(id=building.msftid).get()
    building_center = building.geog.centroid
    le = LidarEngine(
        LineString([access_point.geojson, building_center]), LidarResolution.ULTRA, 1024
    )
    profile = le.getProfile()
    return checkForObstructions(access_point, profile)


def checkForObstructions(access_point, profile):
    # TODO achong: use ap height (from ground?), cpe height and no_check_radius, add curvature of earth
    start = profile[0] + 2  # access_point.height
    end = profile[-1] + 2  # access_point.default_cpe_height
    length = len(profile)
    result = np.linspace(start, end, length) - profile
    if np.any(result < 0):
        return False, np.min(result)
    else:
        return True, np.min(result)
