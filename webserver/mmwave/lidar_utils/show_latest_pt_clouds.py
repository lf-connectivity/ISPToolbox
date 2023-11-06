# (c) Meta Platforms, Inc. and affiliates. Copyright
from mmwave.models import EPTLidarPointCloud
from datetime import datetime, timedelta
import json
from isptoolbox_storage.storage import S3ManifestStorage
from django.core.files.base import ContentFile


TIME_DELTA_DAYS = 30
NEWLY_ADDED_PT_CLOUD_S3_PATH = '-latest-added-pt-clouds.geojson'


def createNewPointCloudAvailability():
    '''
        Upload recently uploaded point cloud boundaries as geojson to S3
    '''
    # Load New Point Clouds
    latest_clouds_added = EPTLidarPointCloud.objects.filter(
        date_time_added_to_isptoolbox__gte=datetime.now()-timedelta(days=TIME_DELTA_DAYS)
    ).all()

    # Create Boundaries
    new_clouds = [
        cloud.high_resolution_boundary if cloud.high_resolution_boundary else cloud.boundary
        for cloud in latest_clouds_added
    ]

    # Create feature collection
    feature_collection = {
        'type': "FeatureCollection",
        'features': [
            {'type': "Feature", 'geometry': json.loads(boundary.json)}
            for boundary in new_clouds
        ]
    }

    # Upload Feature Collection to S3
    contents = json.dumps(feature_collection).encode()
    s3storage = S3ManifestStorage()
    path = datetime.now().strftime('%Y-%m-%d') + NEWLY_ADDED_PT_CLOUD_S3_PATH
    s3storage.save(path, ContentFile(contents))

    return path
