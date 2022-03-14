from celery_async.celery import celery_app as app
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
from mmwave.models import DSMConversionJob, EPTLidarPointCloud
import tempfile
from area import area


@app.task
def exportDSMData(DSMConversionJob_uuid):
    """
    Load the conversion job from the uuid, try to run the conversion
    and if successful upload to S3
    """
    conversion = DSMConversionJob.objects.filter(
        uuid=DSMConversionJob_uuid).get()
    query = (
        EPTLidarPointCloud.objects.filter(
            high_resolution_boundary__isnull=True,
            boundary__intersects=conversion.area_of_interest
        ) |
        EPTLidarPointCloud.objects.filter(
            high_resolution_boundary__isnull=False,
            high_resolution_boundary__intersects=conversion.area_of_interest
        )
    )
    pt_clouds = query.all()
    dsm_engine = DSMTileEngine(conversion.area_of_interest.envelope, pt_clouds)

    with tempfile.NamedTemporaryFile(suffix=".tif") as temp_fp:
        # Run the DSM generation in a separate process, monitor that process and keep the
        # user informed of it's status
        dsm_engine.getDSM(temp_fp.name)
        conversion.error = 'Loading data...'
        conversion.save(update_fields=['error'])
        conversion.error = 'Uploading DSM'
        conversion.save(update_fields=['error'])
        conversion.write_object(temp_fp)


def human_readable_size(size, decimal_places=3):
    for unit in ['B', 'KiB', 'MiB', 'GiB', 'TiB']:
        if size < 1024.0:
            break
        size /= 1024.0
    return f"{size:.{decimal_places}f}{unit}"


def create_time_estimate(aoi):
    return area(aoi.json) * 3.5e-05
