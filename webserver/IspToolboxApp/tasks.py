from celery import shared_task
from IspToolboxApp.Tasks.building_outline_task.building_outline_task import getBoundingBox, getTiles, getTileImages, loopInference, stitchMasks, threshold_buildings, polygonize_buildings, convert_polygons_to_latlon,convertToGeoJsons
from IspToolboxApp.models import BuildingDetection
from django.contrib.gis.geos import GEOSGeometry
from datetime import datetime
from IspToolboxApp.Tasks.MarketEvaluatorTasks import *


@shared_task
def createBuildingsGeojson(geojson, id):
    progress = BuildingDetection.objects.get(pk=id)
    # Query Tiles from Mapbox
    bb = getBoundingBox(geojson)
    tiles = getTiles(bb)
    progress.imagesToLoad = len(tiles)
    progress.save()

    def incrementLoaded():
        progress.imagesLoaded += 1
        progress.save()

    images = getTileImages(tiles, progressUpdate=incrementLoaded)
    progress.save()

    # Run inference
    masks = loopInference(images)
    progress.inferenceComplete = True
    progress.save()
    inferenceImg, mosaic_bb = stitchMasks(masks, tiles)

    # Threshold
    thresh_res = threshold_buildings(inferenceImg)
    progress.thresholdComplete = True
    progress.save()

    # Generate Polygons
    polygons = polygonize_buildings(thresh_res)
    progress.polygonalizationComplete = True
    progress.save()

    # Convert To Latitude Longitude
    polys_latlng = convert_polygons_to_latlon(polygons, thresh_res.size, mosaic_bb)
    # Return Polygons
    building_geojsons = convertToGeoJsons(polys_latlng)
    outputjson_string = '{{"type" : "GeometryCollection", "geometries" : [{}]}}'.format(','.join(building_geojsons))
    geometrycollection = GEOSGeometry(outputjson_string)
    progress.output_geometryCollection = geometrycollection
    progress.completed = datetime.now()
    progress.save()

    return id
