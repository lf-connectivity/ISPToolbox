from celery import shared_task
from mmwave.lidar_utils.DSMEngine import DSMEngine
from mmwave.models import DSMConversionJob, EPTLidarPointCloud
import tempfile
import os
import time
import random
from area import area

DEFAULT_RESOLUTION = 0.5  # meters


@shared_task
def exportDSMData(DSMConversionJob_uuid):
    """
    Load the conversion job from the uuid, try to run the conversion
    and if successful upload to S3
    """
    conversion = DSMConversionJob.objects.filter(uuid=DSMConversionJob_uuid).get()
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
    sources = [cld.url for cld in pt_clouds]
    dsm_engine = DSMEngine(conversion.area_of_interest[0], sources)
    t_estimate = create_time_estimate(conversion.area_of_interest[0].envelope)
    start_time = time.time()

    with tempfile.NamedTemporaryFile(suffix=".tif") as temp_fp:
        # Run the DSM generation in a separate process, monitor that process and keep the
        # user informed of it's status
        process = dsm_engine.getDSM(DEFAULT_RESOLUTION, temp_fp.name)
        conversion.error = 'Loading data...'
        conversion.save(update_fields=['error'])
        while process.poll() is None:
            temp_fp.flush()
            size = os.stat(temp_fp.name).st_size
            if size > 0:
                conversion.error = f'creating output file: {human_readable_size(size, 1)}'
            else:
                # select a random loading message and send to the client
                status_msgs = ['loading', 'filtering', 'processing']
                conversion.error = random.choice(status_msgs)
                time_remaining = max((start_time + t_estimate) - time.time(), 0)
                time_estimate = (
                    f': approx time remaining - {int(time_remaining)} seconds'
                    if time_remaining > 0 else ': should finish soon'
                )
                conversion.error = conversion.error + time_estimate

            conversion.save(update_fields=['error'])
            time.sleep(3)
        conversion.error = 'Uploading DSM'
        conversion.save(update_fields=['error'])
        conversion.writeDSMtoS3(temp_fp)


def human_readable_size(size, decimal_places=3):
    for unit in ['B', 'KiB', 'MiB', 'GiB', 'TiB']:
        if size < 1024.0:
            break
        size /= 1024.0
    return f"{size:.{decimal_places}f}{unit}"


def create_time_estimate(aoi):
    return area(aoi.json) * 3.5e-05
