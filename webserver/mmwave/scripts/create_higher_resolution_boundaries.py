from mmwave.models import EPTLidarPointCloud
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.gdal import SpatialReference, CoordTransform
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall
from django.conf import settings
import logging
import subprocess
import json
import shlex


def createInfoCommand(url, ept_res=800.0, hexbin_edge_size=1000, hexbin_threshold=1):
    return shlex.split(
        'pdal info --all --driver readers.ept ' +
        f'--readers.ept.resolution={ept_res} ' +
        '--readers.ept.threads=6 ' +
        f'--filters.hexbin.edge_size={hexbin_edge_size} ' +
        f'--filters.hexbin.threshold={hexbin_threshold} ' +
        f'"{url}"'
    )


def calculateEPTHighResolutionBoundary(cloud):
    """
        Calculate High Resolution Boundary of Point Cloud and save to model
    """
    default_coords = SpatialReference(4326)
    try:
        # Change Projection to 4236, write to cloud
        command = createInfoCommand(url=cloud.url, ept_res=50.0, hexbin_edge_size=50, hexbin_threshold=1)
        result = subprocess.run(command, stdout=subprocess.PIPE)
        if result.returncode == 0:
            data = json.loads(result.stdout)
            projection = SpatialReference(data['metadata']['srs']['wkt'])
            high_res_boundary = GEOSGeometry(data['boundary']['boundary'], srid=projection.srid)
            coordinate_transform = CoordTransform(projection, default_coords)
            logging.info('converting coordinates...')
            high_res_boundary.transform(coordinate_transform)
            cloud.high_resolution_boundary = high_res_boundary
            cloud.save(update_fields=['high_resolution_boundary'])
        else:
            raise Exception('failed to get high resolution boundary')
    except Exception as e:
        raise e


def processPointCloudBoundaries():
    """
        Use PDAL to generate higher-resolution boundaries and write back to database:

        This is because the boundaries provided by EntWine are sometimes too coarse
        to determine if a link will overlap them
    """
    successful_conversions = []
    failed_conversions = []
    default_high_res_boundary = EPTLidarPointCloud._meta.get_field('high_resolution_boundary').get_default()
    for cloud in EPTLidarPointCloud.objects.all().iterator():
        if cloud.high_resolution_boundary == default_high_res_boundary:
            logging.info(f'Processing {cloud.name}...')
            try:
                calculateEPTHighResolutionBoundary(cloud)
                successful_conversions.append(cloud.name)
            except Exception as e:
                failed_conversions.append(f'{cloud.name} {str(e)}')

    # Return the failed and successful clouds boundaries
    return successful_conversions, failed_conversions


def updatePointCloudBoundariesTask():
    successes, failures = processPointCloudBoundaries()
    new_boundaries = "\n".join(successes)
    failed_high_resolution_boundaries = "\n".join(failures)
    result_msg = f'New Boundaries:\n {len(successes)}\n Failed to Update Boundaries:\n {len(failures)}' + \
                 f'Point Clouds:\n{new_boundaries}\nFailed To Create Boundaries:\n{failed_high_resolution_boundaries}'
    if settings.PROD:
        sendEmailToISPToolboxOncall(
            '[Automated Message 🤖 ][Updated LiDAR Boundaries]',
            result_msg
        )
