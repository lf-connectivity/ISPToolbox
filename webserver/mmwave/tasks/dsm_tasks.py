from celery import shared_task
from mmwave.lidar_utils.DSMEngine import DSMEngine
from mmwave.models import DSMConversionJob, EPTLidarPointCloud
import tempfile

DEFAULT_RESOLUTION = 1  # meters


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

    with tempfile.NamedTemporaryFile(suffix="tif") as temp_fp:
        dsm_engine.getDSM(1, temp_fp.name)
        conversion.writeDSMtoS3(temp_fp)
