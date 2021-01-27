import requests
import boto3
from django.conf import settings
from functools import reduce
from shapely.geometry import box, Polygon, MultiPolygon, GeometryCollection
from shapely.geometry import shape
from shapely.geometry import mapping


def convertGeometryToGeojsonMapbox(geometry):
    """
        Converts geometry into a format mapbox upload will accept

        Alternatively you can use the serializer in geojson mode
        `https://docs.djangoproject.com/en/3.1/ref/contrib/gis/serializers/`
    """
    return {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': geometry,
                'properties': {}
            }
        ]
    }


def uploadNewTileset(geojson_data, tileset_name):
    """
        https://docs.mapbox.com/api/maps/uploads/

        tileset_name has limitations, see link above for restrictions
    """
    # Get Upload Information
    params = [
        ('access_token', settings.MAPBOX_ACCESS_TOKEN_BACKEND),
    ]
    response = requests.post('https://api.mapbox.com/uploads/v1/isptoolbox/credentials', params=params)

    # Use Upload information to Write to S3
    upload_information = response.json()
    s3_client = boto3.client(
        's3',
        aws_access_key_id=upload_information['accessKeyId'],
        aws_secret_access_key=upload_information['secretAccessKey'],
        aws_session_token=upload_information['sessionToken']
    )
    s3_client.upload_fileobj(geojson_data, upload_information['bucket'], upload_information['key'])
    # Start the upload processing pipeline on mapbox's side
    headers = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
    }

    params = (
        ('access_token', settings.MAPBOX_ACCESS_TOKEN_BACKEND),
    )

    data = {"url": upload_information['url'], "tileset": f"{settings.MAPBOX_ACCOUNT}.{tileset_name}"}
    response = requests.post('https://api.mapbox.com/uploads/v1/isptoolbox', headers=headers, params=params, json=data)

    return response, data


def prepareGeoJSONUploadMapbox(geojson):
    """
        Splits large geojson into smaller features to make tiling process faster

        flattens into feature collection with properties member
    """
    shapely_geom = shape(geojson)
    res = katana(shapely_geom, 3)  # 3degrees (lat, lon) is used as the threshold
    gc = GeometryCollection(res)
    data_out = mapping(gc)
    feats = flatten(data_out)
    return {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': feat,
                'properties': {}
            } for feat in feats
        ]
    }


def katana(geometry, threshold, count=0):
    """Split a Polygon into two parts across it's shortest dimension"""
    bounds = geometry.bounds
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    if max(width, height) <= threshold or count == 250:
        # either the polygon is smaller than the threshold, or the maximum
        # number of recursions has been reached
        return [geometry]
    if height >= width:
        # split left to right
        a = box(bounds[0], bounds[1], bounds[2], bounds[1]+height/2)
        b = box(bounds[0], bounds[1]+height/2, bounds[2], bounds[3])
    else:
        # split top to bottom
        a = box(bounds[0], bounds[1], bounds[0]+width/2, bounds[3])
        b = box(bounds[0]+width/2, bounds[1], bounds[2], bounds[3])
    result = []
    for d in (a, b,):
        c = geometry.intersection(d)
        if not isinstance(c, GeometryCollection):
            c = [c]
        for e in c:
            if isinstance(e, (Polygon, MultiPolygon)):
                result.extend(katana(e, threshold, count+1))
    if count > 0:
        return result
    # convert multipart into singlepart
    final_result = []
    for g in result:
        if isinstance(g, MultiPolygon):
            final_result.extend(g)
        else:
            final_result.append(g)
    return final_result


def flatten(geojson):
    """
        Function to flatten geojson

            Parameters:
                geojson (dict): geojson dictionary
    """
    obj_type = geojson.get('type', None)

    if(obj_type == 'FeatureCollection'):
        geojson['features'] = reduce(lambda mem, feature: mem + feature, map(flatten, geojson['features']))
        return geojson
    elif(obj_type == 'Feature'):
        if (not geojson['geometry']):
            return [geojson]
        return map(flatten_helper(geojson), flatten(geojson['geometry']))
    elif(obj_type == 'MultiPoint'):
        return map(lambda x: {'type': "Point", 'coordinates': x}, geojson['coordinates'])
    elif(obj_type == 'MultiPolygon'):
        return map(lambda x: {'type': "Polygon", 'coordinates': x}, geojson['coordinates'])
    elif(obj_type == "MultiLineString"):
        return map(lambda x: {'type': "LineString", 'coordinates': x}, geojson['coordinates'])
    elif(obj_type == "GeometryCollection"):
        return reduce(lambda l, geoms: l + geoms, map(flatten, geojson['geometries']))
    else:
        return [geojson]


def flatten_helper(geojson):
    """
        Helper function for flatten
    """
    def helper_func(geom):
        data = {
                'type': "Feature",
                'properties': geojson['properties'],
                'geometry': geom
            }
        if (geojson.get('id', None)):
            data['id'] = geojson['id']
        return data
    return helper_func
