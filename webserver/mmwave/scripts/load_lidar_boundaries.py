import requests
import json
from mmwave.models import EPTLidarPointCloud
from django.contrib.gis.geos import GEOSGeometry, GeometryCollection, Polygon
from dataUpdate.util.mail import sendNotifyEmail
from isptoolbox_storage.storage import S3ManifestStorage
from django.core.files.base import ContentFile
from django.conf import settings


PT_CLOUD_GEOJSON_S3_PATH = 'pt_clouds.geojson'
PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH = 'pt_clouds_overlay.geojson'
SUCCESSFUL_UPDATE_SUBJECT = "[Automated Message][Success] Automated Point Cloud Update Successful"
UNSUCCESSFUL_UPDATE_SUBJECT = "[Automated Message][Failure] Automated Point Cloud Update Failed"


def loadBoundariesFromEntWine(send_email_success=False, send_email_failure=True):
    try:
        response = requests.get('https://usgs.entwine.io/boundaries/resources.geojson')
        response_content = json.loads(response.content)
        new_point_clouds = []
        for feat in response_content['features']:
            props = feat['properties']
            pt_cloud_exists = EPTLidarPointCloud.objects.filter(
                    name=props['name'],
                    url=props['url'],
                    count=props['count'],
                    srs=3857
                ).exists()
            if not pt_cloud_exists:
                pt_cloud, created = EPTLidarPointCloud.objects.get_or_create(
                    name=props['name'],
                    url=props['url'],
                    count=props['count'],
                    boundary=GEOSGeometry(json.dumps(feat['geometry'])),
                    srs=3857
                )
                pt_cloud.save()
                if created:
                    new_point_clouds.append(pt_cloud)
        if send_email_success or len(new_point_clouds) > 0:
            point_cloud_names = '\n'.join([cloud.name for cloud in new_point_clouds])
            sendNotifyEmail(
                SUCCESSFUL_UPDATE_SUBJECT,
                f'Successfully loaded {len(new_point_clouds)} new point clouds into the database\n' + point_cloud_names
            )
        if len(new_point_clouds) > 0 and settings.PROD:
            pt_clouds = EPTLidarPointCloud.objects.all()
            feature_collection = {
                'type': "FeatureCollection",
                'features': [
                    {'type': "Feature", 'geometry': json.loads(cld.boundary.json)}
                    for cld in pt_clouds
                ]
            }
            contents = json.dumps(feature_collection).encode()
            s3storage = S3ManifestStorage()
            s3storage.save(PT_CLOUD_GEOJSON_S3_PATH, ContentFile(contents))
    except Exception as e:
        if send_email_failure:
            sendNotifyEmail(UNSUCCESSFUL_UPDATE_SUBJECT, f'Error: {str(e)}')

    return new_point_clouds


def createInvertedOverlay():
    clouds = EPTLidarPointCloud.objects.all()
    gc = GeometryCollection([cld.boundary for cld in clouds])
    bounding_box = gc.extent
    extent = Polygon.from_bbox(bounding_box)
    inverted_overlay = extent.difference(gc)
    data = {'bb': bounding_box, 'overlay': json.loads(inverted_overlay.json)}
    contents = json.dumps(data).encode()
    if settings.PROD:
        s3storage = S3ManifestStorage()
        s3storage.save(PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH, ContentFile(contents))


if __name__ == "__main__":
    loadBoundariesFromEntWine()
