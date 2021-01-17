import requests
import json

from isptoolbox_storage.mapbox.upload_tileset import convertGeometryToGeojsonMapbox
from mmwave.models import EPTLidarPointCloud
from django.contrib.gis.geos import GEOSGeometry, GeometryCollection, Polygon
from dataUpdate.util.mail import sendNotifyEmail
from isptoolbox_storage.storage import S3ManifestStorage
from django.core.files.base import ContentFile
from django.conf import settings


PT_CLOUD_GEOJSON_S3_PATH = 'pt_clouds.geojson'
PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH = 'pt_clouds_overlay.geojson'
HIGH_RES_PT_CLOUD_GEOJSON_S3_PATH = 'high_res_pt_clouds.geojson'
HIGH_RES_PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH = 'high_res_pt_clouds_overlay.geojson'
SUCCESSFUL_UPDATE_SUBJECT = "[Automated Message][Success] Automated Point Cloud Update Successful"
UNSUCCESSFUL_UPDATE_SUBJECT = "[Automated Message][Failure] Automated Point Cloud Update Failed"

GLOBAL_BOUNDING_BOX = [-180, -90, 180, 90]


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
        if (send_email_success or len(new_point_clouds) > 0) and settings.PROD:
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
        if send_email_failure and settings.PROD:
            sendNotifyEmail(UNSUCCESSFUL_UPDATE_SUBJECT, f'Error: {str(e)}')

    return new_point_clouds


def createInvertedOverlay(
            use_high_resolution_boundaries=False,
            invert=True
        ):
    """
        Gets all the point cloud boundaries from the database, creates an inverted overlay
        uploads to S3
    """
    clouds = EPTLidarPointCloud.objects.all()
    gc = GeometryCollection(
        [
            cld.high_resolution_boundary if (
                    use_high_resolution_boundaries and cld.high_resolution_boundary is not None
                ) else cld.boundary
            for cld in clouds
        ]
    )
    overlay = gc
    if invert:
        extent = Polygon.from_bbox(GLOBAL_BOUNDING_BOX)
        overlay = extent.difference(gc)

    data = json.loads(overlay.json)
    fc = convertGeometryToGeojsonMapbox(data)
    contents = json.dumps(fc).encode()
    file_obj = ContentFile(contents)
    if settings.PROD:
        output_path = PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH
        if use_high_resolution_boundaries:
            output_path = HIGH_RES_PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH
        s3storage = S3ManifestStorage()
        s3storage.save(output_path, file_obj)
    return file_obj


if __name__ == "__main__":
    loadBoundariesFromEntWine()
