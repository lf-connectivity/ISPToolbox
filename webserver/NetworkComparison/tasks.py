from celery import shared_task
from django.db import connections
from NetworkComparison.util import squaredMetersToMiles
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getQueryTemplate
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


def sync_send(channelName, consumer, value):
    channel_layer = get_channel_layer()
    resp = {
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


@shared_task
def genBuildingCount(include, exclude, channelName):
    query_skeleton = building_count_skeleton
    query_skeleton = getQueryTemplate(query_skeleton, exclude is not None, False)
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [
            include, exclude
        ] if exclude is not None else [include]
        cursor.execute(query_skeleton, query_arguments)
        results = cursor.fetchone()
        buildingCount = results[0]
        sync_send(channelName, "building.count", str(buildingCount))
        print("successfully completed genBuildingCount")


@shared_task
def genPolySize(include, exclude, channelName):
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
        sync_send(channelName, "polygon.area", str(polygonArea))
        print("successfully completed genPolySize")


building_count_skeleton = "SELECT COUNT(*) FROM msftcombined WHERE {};"

poly_size_skeleton = """
    SELECT ST_Area(ST_GeomFromGeoJSON(%s)::geography) AS area
"""

poly_size_skeleton_exclude = """
    WITH ie AS(
        ST_GeomFromGeoJSON(%s)::geography AS include
        ST_GeomFromGeoJSON(%s)::geography AS exclude
    )
    SELECT ST_Area(ie.include) - ST_Area(ST_Intersection(ie.include, ie.exclude)) AS area
"""
