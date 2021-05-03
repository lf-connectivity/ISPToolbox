from mmwave.models import EPTLidarPointCloud
from typing import Iterable
from django.contrib.gis.geos import GEOSGeometry
from mmwave.lidar_utils import SlippyTiles
import tempfile
import shlex
import subprocess
import time
import logging
from IspToolboxApp.util.s3 import readMultipleS3Objects


class DSMTileEngine:
    def __init__(self, polygon: GEOSGeometry, clouds: Iterable[EPTLidarPointCloud]):
        self.polygon = polygon
        # Sort by collection start date to make sure latest data is shown first
        self.clouds = sorted(clouds, key=lambda cld: cld.collection_start_date, reverse=True)

    def getDSM(self, output_filepath):
        start = time.time()
        tiles = SlippyTiles.getTiles(self.polygon, SlippyTiles.DEFAULT_OUTPUT_ZOOM)
        with tempfile.TemporaryDirectory() as tmp_dir:
            jobs = []
            tifs = []
            for tile in tiles:
                x, y = tile
                for cloud in self.clouds:
                    # if cloud.existsTile(x, y, SlippyTiles.DEFAULT_OUTPUT_ZOOM):
                    with tempfile.NamedTemporaryFile(suffix='.tif', delete=False, dir=tmp_dir) as tmp_tif:
                        jobs.append(cloud.get_s3_key_tile(x, y, SlippyTiles.DEFAULT_OUTPUT_ZOOM))
                        tifs.append(tmp_tif.name)
                        break
            logging.info(f'Time to generate jobs: {time.time() - start} jobs:{ len(jobs)}')
            readMultipleS3Objects(jobs, tifs)
            logging.info(f'Finished: {time.time() - start} ')
            cmd = shlex.split(f'gdal_merge.py -o {output_filepath} -of GTiff ' + " ".join(tifs))
            process = subprocess.Popen(cmd)
            process.wait()
