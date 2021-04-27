from mmwave.lidar_utils.SlippyTiles import getTiles, getBoundaryofTile
from mmwave.lidar_utils.DSMEngine import DSMEngine
from celery import shared_task
from mmwave.models import EPTLidarPointCloud
import tempfile

DEFAULT_OUTPUT_ZOOM = 17


def convertPtCloudToDSMTiled(pk: int):
    cloud = EPTLidarPointCloud.objects.get(pk=pk)
    boundary = cloud.high_resolution_boundary if cloud.high_resolution_boundary else cloud.boundary
    tiles = getTiles(boundary, DEFAULT_OUTPUT_ZOOM)
    for tile in tiles:
        createTileDSM.delay(tile, DEFAULT_OUTPUT_ZOOM, pk)


@shared_task
def createTileDSM(tile: tuple, z: int, pk: int):
    # Load the Tile and the Point Cloud
    x, y = tile
    cloud = EPTLidarPointCloud.objects.get(pk=pk)
    boundary = cloud.high_resolution_boundary if cloud.high_resolution_boundary else cloud.boundary
    boundary_tile = getBoundaryofTile(x, y, DEFAULT_OUTPUT_ZOOM)
    # If tile is valid run computation
    if boundary.intersects(boundary_tile) and not cloud.existsTile(x, y, z, suffix=".tif", tile_prod=True):
        engine = DSMEngine(boundary_tile, [cloud.url])
        with tempfile.NamedTemporaryFile(suffix='.tif') as tmp_tif:
            engine.getDSM(1.0, tmp_tif.name)
            cloud.createTile(x, y, z, tmp_tif, suffix=".tif", tile_prod=True)
