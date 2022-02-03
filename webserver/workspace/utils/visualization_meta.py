from workspace import models
from mmwave import models as mmwave_models
import json
from django.contrib.gis.geos import LineString, Point

from workspace.models.network_models import AccessPointSector

BUFFER_POINT_M = 50


def get_workspace_potree_visualization_metadata(feature: models.WorkspaceFeature):
    """
    Calculate metadata to visualize potree
    """
    geojson = feature.geojson
    if isinstance(feature, models.AccessPointSector):
        geojson = feature.observer
    clouds = mmwave_models.EPTLidarPointCloud.query_intersect_aoi(
        geojson)
    if len(clouds) == 0:
        raise Exception
    clouds = list(clouds)
    clouds.sort(key=lambda x: x.collection_start_date)
    metadata = {
        'clouds': [{'name': cld.name, 'url': cld.url} for cld in clouds],
    }
    if isinstance(geojson, LineString):
        metadata.update(PotreeMetaLine(feature, clouds[0].srs))
    elif isinstance(geojson, Point):
        metadata.update(PotreeMetaPoint(feature, clouds[0].srs))
    return metadata


def PotreeMetaLine(feature: models.WorkspaceFeature, srs: int):
    """
    Get metadata necessary to render line in potree
    """
    geometry_T = feature.geojson.transform(srs, clone=True)
    bb = geometry_T.extent
    if isinstance(feature, models.APToCPELink):
        start = feature.ap if feature.ap else feature.sector
        heights = [start.height, feature.cpe.height],
        dtms = [start.get_dtm_height(), feature.cpe.get_dtm_height()]
        names = [start.name, feature.cpe.name]
        tx = json.loads(start.observer.transform(srs, clone=True).json)
        rx = json.loads(feature.cpe.geojson.transform(srs, clone=True).json)
    elif isinstance(feature, models.PointToPointLink):
        heights = [feature.radio0hgt, feature.radio1hgt]
        dtms = feature.get_dtm_heights()
        names = ['radio0', 'radio1']
        rx = json.loads(
            Point(feature.geojson[1], srid=feature.geojson.srid).transform(srs, clone=True).json)
        tx = json.loads(
            Point(feature.geojson[0], srid=feature.geojson.srid).transform(srs, clone=True).json)
    else:
        raise Exception('Unknown Linestring feature type')

    metadata = {
        'type': 'LineString',
        'heights': heights,
        'dtms': dtms,
        'names': names,
        'bb': bb,
        'tx': tx,
        'rx': rx,
    }
    return metadata


def PotreeMetaPoint(feature, srs):
    """
    Get metadata necessary to render point in potree
    """
    geojson = feature.geojson
    if isinstance(feature, AccessPointSector):
        geojson = feature.observer
    metadata = {
        'type': 'Point',
        'center': json.loads(geojson.transform(srs, clone=True).json),
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
