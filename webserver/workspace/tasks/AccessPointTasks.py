from celery import shared_task
from workspace.models import (
    AccessPointLocation, AccessPointCoverage, BuildingCoverage, BuildingCoverage,
    CoverageStatus, CoverageCalculationStatus
)
from gis_data.models import MsftBuildingOutlines
from django.contrib.gis.geos import GEOSGeometry, LineString
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from mmwave.lidar_utils.LidarEngine import LidarEngine, LidarResolution

import numpy as np
import math
import json
import random
from shapely.ops import polylabel
from shapely import wkt


EARTH_RADIUS = 6371008.8
ARC_SECOND_DEGREES = 1.0/ 60.0 / 60.0
LIMIT_BUILDINGS = 10000
INTERVAL_UPDATE_FRONTEND = 10



def sendMessageToChannel(network_id, message):
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id
    async_to_sync(channel_layer.group_send)(channel_name, message)


@shared_task
def generateAccessPointCoverage(channel_id, request):
    """
    Calculate the coverage area of an access point location
    """
    ap = AccessPointLocation.objects.get(uuid=request['uuid'])
    # Get circle geometry
    circle_json = json.dumps(createGeoJSONCircle(ap.location, ap.max_radius))
    circle = GEOSGeometry(circle_json)
    # Find all buildings that intersect the access point radius
    buildings = MsftBuildingOutlines.objects.filter(geog__intersects=circle).all()[0:LIMIT_BUILDINGS]
    ap_coverage = AccessPointCoverage(ap=ap)
    ap_coverage.save()
    nearby_buildings = []
    for building in buildings:
        b = BuildingCoverage(msftid=building.id)
        b.save()
        ap_coverage.nearby_buildings.add(b)
        nearby_buildings.append(b)
    ap_coverage.save()

    # For each building, run calculation if it's reachable
    # for idx, building in enumerate(nearby_buildings):
    #     serviceable, margin = checkBuildingServiceable(ap, building)
    #     building.status = CoverageStatus.SERVICEABLE.value if serviceable else CoverageStatus.UNSERVICEABLE.value
    #     building.save()
    #     if idx % 10 == 0:
    #         sendMessageToChannel(channel_id, {"type": "ap.status", "status" :ap_coverage.status, "uuid": str(ap.uuid)})
    # save everything and then notify the client
    ap_coverage.status = CoverageCalculationStatus.COMPLETE.value
    ap_coverage.save()
    sendMessageToChannel(channel_id, {"type": "ap.status", "status" :ap_coverage.status, "uuid": str(ap.uuid)})


def checkBuildingServiceable(access_point, building):
    """
    Helper function, loads up lidar profile between centroid of building and accesspoint, calculates if link is feasible

    """
    building = MsftBuildingOutlines.objects.filter(id=building.msftid).get()
    building_center = building.geog.centroid
    le = LidarEngine(LineString([access_point.location, building_center]), LidarResolution.ULTRA, 1024)
    profile = le.getProfile()
    return checkForObstructions(access_point, profile)


def checkForObstructions(access_point, profile):
    # TODO achong: use ap height (from ground?), cpe height and no_check_radius, add curvature of earth
    start = profile[0] + 2 #access_point.height
    end = profile[-1] + 2 #access_point.default_cpe_height
    length = len(profile)
    result = np.linspace(start, end, length) - profile
    if np.any(result < 0):
        return False, np.min(result)
    else:
        return True, np.min(result)

def destination(origin, distance, bearing):
    """
    Helper function to get location of point at distnace, bearing from point 

    distance 
    """
    longitude1 = math.radians(origin[0])
    latitude1 = math.radians(origin[1])
    bearingRad = math.radians(bearing)
    radians = distance / (EARTH_RADIUS / 1000.0)

    latitude2 = math.asin(
        math.sin(latitude1) * math.cos(radians) +
        math.cos(latitude1) * math.sin(radians) * math.cos(bearingRad)
    )
    longitude2 = longitude1 + math.atan2(
        math.sin(bearingRad) * math.sin(radians) * math.cos(latitude1),
        math.cos(radians) - math.sin(latitude1) * math.sin(latitude2)
    )
    lng = math.degrees(longitude2)
    lat = math.degrees(latitude2)

    return [lng, lat]

def createGeoJSONCircle(center, radius, steps=64):
    """
    Helper function to create geojson for circle of constant radius

    center - latitude, longitude
    radius - km
    """
    coordinates = []
    for i in range(steps):
        coordinates.append(
            destination(center, radius, (i * -360) / steps)
        )
    coordinates.append(coordinates[0])
    return {
        'type': "Polygon",
        'coordinates': [coordinates]
    }