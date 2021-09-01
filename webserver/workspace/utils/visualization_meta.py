from workspace import models
from mmwave import models as mmwave_models
import json


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
    first_cloud = clouds[0]
    metadata = {
        'clouds': [{'name': cld.name, 'url': cld.url} for cld in clouds],
        'center': json.loads(feature.geojson.transform(first_cloud.srs, clone=True).json),
        'height': feature.height,
        'dtm': feature.get_dtm_height(),
        'name': feature.name
    }
    buffer = 50
    metadata.update(
        {'bb': [
            metadata['center']['coordinates'][0] - buffer,
            metadata['center']['coordinates'][1] - buffer,
            metadata['center']['coordinates'][0] + buffer,
            metadata['center']['coordinates'][1] + buffer,
            metadata['dtm'] - buffer,
            metadata['height'] + metadata['dtm'] + buffer,
        ]
        }
    )

    return metadata
