# (c) Meta Platforms, Inc. and affiliates. Copyright
from celery.utils.log import get_task_logger
from mmwave.models import EPTLidarPointCloud
from typing import Iterable
from django.contrib.gis.geos import GEOSGeometry, Point
from mmwave.lidar_utils import SlippyTiles
import tempfile
import shlex
import os
import time
from IspToolboxApp.util.s3 import readMultipleS3Objects
import rasterio

from workspace.utils.process_utils import celery_task_subprocess_check_output_wrapper


USE_OLD_TILES = "/tile"
TASK_LOGGER = get_task_logger(__name__)


class DSMTileEngine:
    def __init__(self, polygon: GEOSGeometry, clouds: Iterable[EPTLidarPointCloud]):
        self.polygon = polygon
        # Sort by collection start date to make sure latest data is shown first
        self.clouds = sorted(
            clouds, key=lambda cld: cld.collection_start_date, reverse=True)

    def getDSM(self, output_filepath):
        start = time.time()
        tiles = SlippyTiles.getTiles(
            self.polygon, SlippyTiles.DEFAULT_OUTPUT_ZOOM)
        with tempfile.TemporaryDirectory() as tmp_dir:
            jobs = []
            tifs = []
            for tile in tiles:
                x, y = tile
                for cloud in self.clouds:
                    # Check for overlapping tiles
                    if cloud.existsTile(x, y, SlippyTiles.DEFAULT_OUTPUT_ZOOM):
                        tmp_tif_name = os.path.join(tmp_dir, f"{cloud.pk},{x},{y},{SlippyTiles.DEFAULT_OUTPUT_ZOOM}.tif")
                        jobs.append(cloud.get_s3_key_tile(
                            x, y, SlippyTiles.DEFAULT_OUTPUT_ZOOM, old_path=USE_OLD_TILES))
                        tifs.append(tmp_tif_name)
                        break
            TASK_LOGGER.info(
                f'Time to generate jobs: {time.time() - start} jobs:{ len(jobs)}')
            readMultipleS3Objects(jobs, tifs)
            TASK_LOGGER.info(f'Finished: {time.time() - start} ')
            cmd = shlex.split(
                f'gdal_merge.py -o {output_filepath} -of GTiff {" ".join(tifs)}')
            celery_task_subprocess_check_output_wrapper(cmd)

    def getSurfaceHeight(self, pt: Point) -> float:
        # get tile coordinates x,y,z
        tile_x, tile_y = SlippyTiles.deg2num(
            pt[1], pt[0], SlippyTiles.DEFAULT_OUTPUT_ZOOM)
        # read the tile from s3
        with tempfile.NamedTemporaryFile(suffix='.tif') as tmp_tif:
            found_tif = False
            for cloud in self.clouds:
                if cloud.existsTile(tile_x, tile_y, SlippyTiles.DEFAULT_OUTPUT_ZOOM, old_path=USE_OLD_TILES):
                    cloud.getTile(
                        tile_x, tile_y, SlippyTiles.DEFAULT_OUTPUT_ZOOM, tmp_tif, old_path=USE_OLD_TILES)
                    found_tif = True
                    transformed_pt = pt.transform(cloud.srs, clone=True)
                    break
            # get the value at that point using rasterio
            if found_tif:
                try:
                    with rasterio.open(tmp_tif.name) as dataset:
                        py, px = dataset.index(transformed_pt.x, transformed_pt.y)
                        return dataset.read(1)[py, px]
                except Exception:
                    TASK_LOGGER.error(
                        f"failed to read tif file - id:{cloud.id} " +
                        f"x,y,z:{tile_x},{tile_y},{SlippyTiles.DEFAULT_OUTPUT_ZOOM}"
                    )
                    raise
            else:
                return 0
        return 0
