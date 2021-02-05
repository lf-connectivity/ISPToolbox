from celery import shared_task
from area import area
from django.db import connections
from NetworkComparison.util import squaredMetersToMiles
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getQueryTemplate
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
from django.contrib.gis.geos import GEOSGeometry
from NetworkComparison.NCTasks.osm_anchor_institution_task import fetchAnchorInstitutions
from NetworkComparison.NCTasks.buildings_mst import getBuildingsMST


def sync_send(channelName, consumer, value, uuid):
    channel_layer = get_channel_layer()
    resp = {
        "uuid": uuid,
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


@shared_task
def genBuildingCount(include, channelName, uuid):
    '''
        Computes the count of buildings in applicable include geometry.
        Sends response via channels layer.
        Params:
        include<GeoJSON>: GeoJSON to include
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        <String>: Number of buildings in applicable area
    '''
    query_skeleton = building_count_skeleton
    query_skeleton = getQueryTemplate(query_skeleton, False, False)
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [include]
        cursor.execute(query_skeleton, query_arguments)
        results = cursor.fetchone()
        buildingCount = results[0]
        sync_send(channelName, "building.count", str(buildingCount), uuid)


@shared_task
def genPolySize(include, channelName, uuid):
    '''
        Computes the area in applicable include geometry in miles squared.
        Sends response via channels layer.
        Params:
        include<GeoJSON>: GeoJSON to include
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        <String>: Area of applicable area in miles squared
    '''
    polygonArea = squaredMetersToMiles(area(include))
    sync_send(channelName, "polygon.area", str(polygonArea), uuid)


@shared_task
def genClusteredBuildings(include, distance, minpoints, channelName, uuid):
    '''
        Computes building clusters in applicable include geometry as GeoJSON.
        Sends response via channels layer.
        Params:
        include<GeoJSON>: GeoJSON to include
        distance<Number>: Distance from other polygons (meters) for a polygon to be considered part of a cluster
        minpoints<Number>: Minimum number of points in a cluster
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        Array<Array<GeoJSON>>: An array of clusters of GeoJSON.
    '''
    query_skeleton = cluster_skeleton_include
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [include, distance, minpoints]
        cursor.execute(query_skeleton, query_arguments)
        geometries = {}
        results = cursor.fetchall()
        for result in results:
            geojson = json.loads(result[0])
            clusterNum = str(result[1])
            if clusterNum in geometries:
                geometries[clusterNum].append(geojson)
            else:
                geometries[clusterNum] = [geojson]
        sync_send(channelName, "building.clusters", geometries, uuid)


@shared_task
def genBuildingsMST(include, channelName, uuid):
    graph = getBuildingsMST(include)
    sync_send(channelName, "building.min.span", graph, uuid)


@shared_task
def genAnchorInstitutions(include, channelName, uuid):
    aoi = GEOSGeometry(include)
    anchor_inst = fetchAnchorInstitutions(aoi)
    sync_send(channelName, "anchor.institutions", anchor_inst, uuid)


cluster_skeleton_include = """
    WITH selected AS(
        SELECT
        ST_Transform(ST_SetSRID(St_geomfromgeojson(%s), 4326), 3857) as selected_area_include
    )
    SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)), ST_ClusterDBSCAN(geom, eps := %s, minpoints := %s) over () AS cid
    FROM msftbuildinggeom3857, selected
    WHERE ST_Intersects(geom, selected_area_include);
"""

building_count_skeleton = "SELECT COUNT(*) FROM msftcombined WHERE {};"

poly_size_skeleton = """
    SELECT ST_Area(ST_GeomFromGeoJSON(%s)::geography) AS area
"""
