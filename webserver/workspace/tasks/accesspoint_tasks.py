from celery import shared_task
from workspace.models import (
    AccessPointLocation, AccessPointCoverageBuildings, BuildingCoverage
)
from gis_data.models import MsftBuildingOutlines
from django.contrib.gis.geos import GEOSGeometry, LineString
from mmwave.lidar_utils.LidarEngine import LidarEngine, LidarResolution
from workspace.utils.geojson_circle import createGeoJSONCircle
from workspace.tasks.websocket_utils import updateClientAPStatus

import numpy as np
import json


ARC_SECOND_DEGREES = 1.0 / 60.0 / 60.0
LIMIT_BUILDINGS = 10000
INTERVAL_UPDATE_FRONTEND = 10


@shared_task
def generateAccessPointCoverage(channel_id, request, user_id=None):
    """
    Calculate the coverage area of an access point location
    """
    ap = AccessPointLocation.objects.get(uuid=request['uuid'])
    # Get circle geometry
    circle_json = json.dumps(createGeoJSONCircle(ap.geojson, ap.max_radius))
    circle = GEOSGeometry(circle_json)
    # Find all buildings that intersect the access point radius
    buildings = MsftBuildingOutlines.objects.filter(geog__intersects=circle).all()[0:LIMIT_BUILDINGS]
    if AccessPointCoverageBuildings.objects.filter(ap=ap).exists():
        AccessPointCoverageBuildings.objects.filter(ap=ap).get().delete()
    ap_coverage = AccessPointCoverageBuildings(ap=ap)
    ap_coverage.save()
    nearby_buildings = []
    for building in buildings:
        b = BuildingCoverage(msftid=building.id)
        b.save()
        ap_coverage.nearby_buildings.add(b)
        nearby_buildings.append(b)
    ap_coverage.save()

    ap_coverage.status = AccessPointCoverageBuildings.CoverageCalculationStatus.COMPLETE.value
    ap_coverage.save()
    updateClientAPStatus(channel_id, ap.uuid, user_id)


def checkBuildingServiceable(access_point, building):
    """
    Helper function, loads up lidar profile between centroid of building and accesspoint, calculates if link is feasible

    """
    building = MsftBuildingOutlines.objects.filter(id=building.msftid).get()
    building_center = building.geog.centroid
    le = LidarEngine(LineString([access_point.geojson, building_center]), LidarResolution.ULTRA, 1024)
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
