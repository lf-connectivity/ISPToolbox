from mmwave.lidar_utils.SlippyTiles import getTiles, getBoundaryofTile, DEFAULT_OUTPUT_ZOOM
from mmwave.lidar_utils.DSMEngine import DSMEngine
from webserver.celery import celery_app as app
from mmwave.models import EPTLidarPointCloud, LidarDSMTileModel
import tempfile


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


@app.task
def createTileDSM(tile: tuple, z: int, pk: int):
    # Load the Tile and the Point Cloud
    x, y = tile
    cloud = EPTLidarPointCloud.objects.get(pk=pk)
    lidartile, created = LidarDSMTileModel.objects.get_or_create(
        cld=cloud, zoom=z, x=x, y=y
    )
    boundary_tile = getBoundaryofTile(x, y, DEFAULT_OUTPUT_ZOOM)
    # If tile is valid run computation
    if created or not lidartile.tile.name:
        engine = DSMEngine(boundary_tile, [cloud])
        with tempfile.NamedTemporaryFile(suffix='.tif') as tmp_tif:
            engine.getDSM(1.0, tmp_tif.name)
            lidartile.tile.save(f'{lidartile.pk}', tmp_tif)
    lidartile.save()
    return lidartile.pk
