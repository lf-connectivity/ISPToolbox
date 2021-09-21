from workspace import models
from mmwave import models as mmwave_models
import json
from django.contrib.gis.geos import LineString, Point

BUFFER_POINT_M = 50


def get_workspace_potree_visualization_metadata(feature: models.WorkspaceFeature):
    """
    Calculate metadata to visualize potree
    """
    clouds = mmwave_models.EPTLidarPointCloud.query_intersect_aoi(
        feature.geojson)
    if len(clouds) == 0:
        raise Exception
    clouds = list(clouds)
    clouds.sort(key=lambda x: x.collection_start_date)
    metadata = {
        'clouds': [{'name': cld.name, 'url': cld.url} for cld in clouds],
    }
    if isinstance(feature.geojson, LineString):
        metadata.update(PotreeMetaLine(feature, clouds[0].srs))
    elif isinstance(feature.geojson, Point):
        metadata.update(PotreeMetaPoint(feature, clouds[0].srs))
    return metadata


def PotreeMetaLine(feature: models.APToCPELink, srs):
    """
    Get metadata necessary to render line in potree
    """
    geometry_T = feature.geojson.transform(srs, clone=True)
    bb = geometry_T.extent
    tx = json.loads(feature.ap.geojson.transform(srs, clone=True).json)
    rx = json.loads(feature.cpe.geojson.transform(srs, clone=True).json)
    metadata = {
        'type': 'LineString',
        'heights': [feature.ap.height, feature.cpe.height],
        'dtms': [feature.ap.get_dtm_height(), feature.cpe.get_dtm_height()],
        'names': [feature.ap.name, feature.cpe.name],
        'bb': bb,
        'tx': tx,
        'rx': rx,
    }
    return metadata


def PotreeMetaPoint(feature, srs):
    """
    Get metadata necessary to render point in potree
    """
    metadata = {
        'type': 'Point',
        'center': json.loads(feature.geojson.transform(srs, clone=True).json),
        'height': feature.height,
        'dtm': feature.get_dtm_height(),
        'name': feature.name
    }
    metadata.update(
        {'bb': [
            metadata['center']['coordinates'][0] - BUFFER_POINT_M,
            metadata['center']['coordinates'][1] - BUFFER_POINT_M,
            metadata['center']['coordinates'][0] + BUFFER_POINT_M,
            metadata['center']['coordinates'][1] + BUFFER_POINT_M,
            metadata['dtm'] - BUFFER_POINT_M,
            metadata['height'] + metadata['dtm'] + BUFFER_POINT_M,
        ]
        }
    )
    return metadata
