from celery import shared_task
from django.db import connections
from NetworkComparison.util import squaredMetersToMiles
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getQueryTemplate
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json


def sync_send(channelName, consumer, value, uuid):
    channel_layer = get_channel_layer()
    resp = {
        "uuid": uuid,
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


@shared_task
def genBuildingCount(include, exclude, channelName, uuid):
    '''
        Computes the count of buildings in applicable include/exclude geometry.
        Sends response via channels layer.
        Params:
        include<GeoJSON>: GeoJSON to include
        exclude<GeoJSON>: GeoJSON to exclude
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        <String>: Number of buildings in applicable area
    '''
    query_skeleton = building_count_skeleton
    query_skeleton = getQueryTemplate(query_skeleton, exclude is not None, False)
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [
            include, exclude
        ] if exclude is not None else [include]
        cursor.execute(query_skeleton, query_arguments)
        results = cursor.fetchone()
        buildingCount = results[0]
        sync_send(channelName, "building.count", str(buildingCount), uuid)


@shared_task
def genPolySize(include, exclude, channelName, uuid):
    '''
        Computes the area in applicable include/exclude geometry in miles squared.
        Sends response via channels layer.
        Params:
        include<GeoJSON>: GeoJSON to include
        exclude<GeoJSON>: GeoJSON to exclude
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        <String>: Area of applicable area in miles squared
    '''
    query_skeleton = poly_size_skeleton
    if exclude is not None:
        query_skeleton = poly_size_skeleton_exclude
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [
            include,
            exclude
        ] if exclude is not None else [include]
        cursor.execute(query_skeleton, query_arguments)
        results = cursor.fetchone()
        polygonArea = squaredMetersToMiles(results[0])
        sync_send(channelName, "polygon.area", str(polygonArea), uuid)


@shared_task
def genClusteredBuildings(include, exclude, distance, minpoints, channelName, uuid):
    '''
        Computes building clusters in applicable include/exclude geometry as GeoJSON.
        Sends response via channels layer.
        Params:
        include<GeoJSON>: GeoJSON to include
        exclude<GeoJSON>: GeoJSON to exclude
        distance<Number>: Distance from other polygons (meters) for a polygon to be considered part of a cluster
        minpoints<Number>: Minimum number of points in a cluster
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        Array<Array<GeoJSON>>: An array of clusters of GeoJSON.
    '''
    query_skeleton = cluster_skeleton_include
    if exclude is not None:
        query_skeleton = cluster_skeleton_exclude
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [
            include,
            exclude,
            distance,
            minpoints
        ] if exclude is not None else [include, distance, minpoints]
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


cluster_skeleton_include = """
    WITH selected AS(
        SELECT
        ST_Transform(ST_SetSRID(St_geomfromgeojson(%s), 4326), 3857) as selected_area_include
    )
    SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)), ST_ClusterDBSCAN(geom, eps := %s, minpoints := %s) over () AS cid
    FROM msftbuildinggeom3857, selected
    WHERE ST_Intersects(geom, selected_area_include);
"""

cluster_skeleton_exclude = """
    WITH selected AS(
        SELECT
        ST_Transform(ST_SetSRID(St_geomfromgeojson(%s), 4326), 3857) as selected_area_include,
        ST_Transform(ST_SetSRID(St_geomfromgeojson(%s), 4326), 3857) as selected_area_exclude
    )
    SELECT ST_AsGeoJSON(ST_Transform(geom, 4326)), ST_ClusterDBSCAN(geom, eps := %s, minpoints := %s) over () AS cid
    FROM msftbuildinggeom3857, selected
    WHERE ST_Intersects(geom, selected_area_include) AND NOT ST_Intersects(geom, selected_area_exclude);
"""

building_count_skeleton = "SELECT COUNT(*) FROM msftcombined WHERE {};"

poly_size_skeleton = """
    SELECT ST_Area(ST_GeomFromGeoJSON(%s)::geography) AS area
"""

poly_size_skeleton_exclude = """
    WITH ie AS(
        SELECT
        ST_GeomFromGeoJSON(%s)::geography AS include,
        ST_GeomFromGeoJSON(%s)::geography AS exclude
    )
    SELECT ST_Area(ie.include) - ST_Area(ST_Intersection(ie.include, ie.exclude)) AS area FROM ie
"""
