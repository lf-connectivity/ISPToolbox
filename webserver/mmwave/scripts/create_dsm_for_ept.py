from mmwave.lidar_utils.SlippyTiles import getTiles, getBoundaryofTile, DEFAULT_OUTPUT_ZOOM
from mmwave.lidar_utils.DSMEngine import DSMEngine
from webserver.celery import celery_app as app
from mmwave.models import EPTLidarPointCloud, LidarDSMTileModel
import tempfile
from celery.utils.log import get_task_logger
from celery.exceptions import SoftTimeLimitExceeded


logger = get_task_logger(__name__)


@app.task
def convertPtCloudToDSMTiled(pk: int):
    """
    For a point cloud create all tiles at DEFAULT_OUTPUT_ZOOM
    """
    cloud = EPTLidarPointCloud.objects.get(pk=pk)
    boundary = (
        cloud.high_resolution_boundary if cloud.high_resolution_boundary else
        cloud.boundary
    )
    tiles = getTiles(boundary, DEFAULT_OUTPUT_ZOOM)
    for tile in tiles:
        x, y = tile
        boundary_tile = getBoundaryofTile(x, y, DEFAULT_OUTPUT_ZOOM)
        if boundary.intersects(boundary_tile):
            createTileDSM.delay(tile, DEFAULT_OUTPUT_ZOOM, pk)


@app.task(default_retry_delay=30, max_retries=3, soft_time_limit=120)
def createTileDSM(tile: tuple, z: int, pk: int):
    logger.info(f'creating tile: {(tile, z, pk)}')
    try:
        # Load the Tile and the Point Cloud
        x, y = tile
        cloud = EPTLidarPointCloud.objects.get(pk=pk)
        lidartile, created = LidarDSMTileModel.objects.get_or_create(
            cld=cloud, zoom=z, x=x, y=y
        )
        boundary_tile = getBoundaryofTile(x, y, DEFAULT_OUTPUT_ZOOM)
        # If tile is valid run computation
        if created or not lidartile.tile.name or lidartile.tile.size == 0:
            engine = DSMEngine(boundary_tile, [cloud])
            with tempfile.NamedTemporaryFile(suffix='.tif') as tmp_tif:
                engine.getDSM(1.0, tmp_tif.name)
                lidartile.tile.save(f'{lidartile.pk}', tmp_tif)
        lidartile.save()
        logger.info(f'done creating tile: {(tile, z, pk)}')
        return lidartile.pk
    except SoftTimeLimitExceeded as e:
        logger.error(f'time limit exceeded: {(tile, z, pk)}')
        raise e
