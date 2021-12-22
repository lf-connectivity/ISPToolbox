from celery.utils.log import get_task_logger
from django.db import models
from django.contrib.gis.geos import Point
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
from IspToolboxApp.util.s3 import S3PublicExportMixin, writeMultipleS3Objects
from django.db.models.signals import post_delete
from django.dispatch import receiver
from workspace.models.network_models import AccessPointLocation, AccessPointSector
from workspace.utils.geojson_circle import destination
from mmwave.models import EPTLidarPointCloud, TileModel
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
from mmwave.tasks.link_tasks import getDTMPoint
import uuid
import jwt
import datetime
import math
import tempfile
import shlex
import subprocess
import rasterio
import PIL
from PIL import Image
import numpy as np
import json
from rasterio import mask
from rasterio.warp import calculate_default_transform, reproject, Resampling
import time
import os
import re
import shutil
from numpy import polyfit, polyval
from django.core.validators import MaxValueValidator, MinValueValidator

from workspace.utils.process_utils import celery_task_subprocess_check_output_wrapper


CURRENT_VIEWSHED_VERSION = 1
DEFAULT_PROJECTION = 3857
DEFAULT_OBSTRUCTED_COLOR = [0, 0, 0, 128]
PIL.Image.MAX_IMAGE_PIXELS = 20_000 * 20_000
TASK_LOGGER = get_task_logger(__name__)


class Viewshed(models.Model, S3PublicExportMixin):
    """
    Viewshed computation result
    """
    ap = models.OneToOneField(
        AccessPointLocation,
        on_delete=models.CASCADE,
        null=True, blank=True, default=None
    )
    sector = models.ForeignKey(
        AccessPointSector,
        on_delete=models.CASCADE,
        null=True, blank=True, default=None
    )
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, unique=True)
    hash = models.CharField(
        max_length=255,
        help_text="""
            This hash helps determine if the AP has already been computed.
        """
    )
    version = models.IntegerField(
        default=0,
        db_index=True
    )
    created = models.DateTimeField(auto_now_add=True)
    max_zoom = models.IntegerField(
        default=17, validators=[MinValueValidator(0), MaxValueValidator(20)])
    min_zoom = models.IntegerField(
        default=12, validators=[MinValueValidator(0), MaxValueValidator(20)])

    @property
    def radio(self):
        if self.ap:
            return self.ap
        elif self.sector:
            return self.sector
        else:
            return None

    class CoverageStatus(models.TextChoices):
        VISIBLE = "VISIBLE"
        DEM = "DEM"
        GROUND = "GROUND"
        NORMAL = "NORMAL"

    mode = models.CharField(
        default=CoverageStatus.GROUND,
        max_length=20,
        choices=CoverageStatus.choices
    )

    def createJWT(self):
        """
        Create json webtoken to allow access to tileset over s3 lambda
        """
        encoded_jwt = jwt.encode(
            {
                "tileset": str(self.uuid),
                # token is good for 3 days
                "exp": datetime.datetime.utcnow() + datetime.timedelta(days=3)
            },
            settings.TILESET_LAMBDA_EDGE_SECRET,
            algorithm="HS256"
        )
        return encoded_jwt

    def getBaseTileSetUrl(self, **kwargs):
        """
        Get tileset base url
        """
        prefix = "viewshed/tiles_test"
        if settings.PROD or kwargs.get('tile_prod', False):
            prefix = "viewshed/tiles"
        return f"https://tiles.isptoolbox.io/{prefix}/{self.uuid}/{{z}}/{{y}}/{{x}}.png?access_token={self.createJWT()}"

    def getTilesetInfo(self):
        return {
            'base_url': self.getBaseTileSetUrl(),
            'maxzoom': self.max_zoom,
            'minzoom': self.min_zoom,
            'uuid': self.radio.uuid,
        }

    def calculate_hash(self):
        """
        This function generates a hash to help cache viewshed results
        """
        return f'{self.radio.height},{self.radio.max_radius},' +\
            f'{self.radio.observer.x},{self.radio.observer.y},' +\
            f'{self.radio.default_cpe_height}'

    def result_cached(self) -> bool:
        return self.hash == self.calculate_hash()

    def delete(self):
        self.delete_object()
        super(Viewshed, self).delete()

    def get_s3_key(self, **kwargs) -> str:
        if settings.PROD:
            key = 'viewshed/viewshed-tower-' + \
                str(self.radio.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        else:
            key = 'viewshed/test-viewshed-tower-' + \
                str(self.radio.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        return key

    def translate_dtm_height_to_dsm_height(self) -> float:
        point = self.radio.observer
        dtm = getDTMPoint(point)
        tile_engine = DSMTileEngine(
            point, EPTLidarPointCloud.query_intersect_aoi(point))
        dsm = tile_engine.getSurfaceHeight(point)
        return self.radio.height + dtm - dsm

    def calculateViewshed(self, status_callback=None) -> None:
        """
        Compute Viewshed of Access Point
        """
        # Delete all tiles from previous calculations
        aoi = self.radio.getDSMExtentRequired()
        dsm_engine = DSMTileEngine(
            aoi, EPTLidarPointCloud.query_intersect_aoi(aoi))
        with tempfile.NamedTemporaryFile(mode='w+b', suffix=".tif") as dsm_file:
            start = time.time()
            if status_callback is not None:
                status_callback("Loading coverage data",
                                self.__timeRemainingViewshed(0))
            try:
                dsm_engine.getDSM(dsm_file.name)
            except Exception:
                raise DSMAvailabilityException

            TASK_LOGGER.info(f'dsm download: {time.time() - start}')
            if status_callback is not None:
                status_callback("Computing line of sight",
                                self.__timeRemainingViewshed(1))
            self.__renderViewshed(
                dsm_file=dsm_file, status_callback=status_callback)
        if status_callback is not None:
            status_callback(None, None)
        self.hash = self.calculate_hash()
        self.save(update_fields=['hash'])

    def __timeRemainingViewshed(self, step: int) -> float:
        # DSM download polyfit 1,2,3 Mile - 3.5, 10, 23 sec
        # Compute Viewshed polyfit - 25, 82, 173 sec
        # Compute Tiling and Upload polyfit - 8.5, 10, 28 sec
        samples = [1, 2, 3]
        polynomials = [
            polyfit(samples, [3, 10, 23], 2),  # get dsm tiles
            polyfit(samples, [0.5, 1, 2], 2),  # compute viewshed
            polyfit(samples, [1, 2, 4], 2),  # colorize + reproject
            polyfit([0.5] + samples, [2.5, 5.4, 12, 24], 2),  # tile results
            polyfit([0.5] + samples, [0.5, 1.3, 4.5, 10], 2),  # upload results
        ]
        time_remaining = 0
        for i in range(step, len(polynomials)):
            time_remaining = time_remaining + \
                polyval(polynomials[i], self.radio.radius_miles)
        return time_remaining

    def __createRawGDALViewshedCommand(self, dsm_filepath, output_filepath, dsm_projection):
        """
        Generate shell commmand to run gdal_viewshed: requires gdal-bin > 3.1.0

        documentation: https://gdal.org/programs/gdal_viewshed.html
        """
        transformed_observer = self.radio.observer.transform(
            dsm_projection, clone=True)
        transformed_height = self.translate_dtm_height_to_dsm_height()
        output_value = 1
        if self.mode != Viewshed.CoverageStatus.NORMAL:
            output_value = -1
        return f"""gdal_viewshed -b 1 -ov {output_value}
            -oz {transformed_height} -tz {self.radio.default_cpe_height} -md {self.__calculateRadiusViewshed()}
            -ox {transformed_observer.x} -oy {transformed_observer.y} -om {self.mode}
            {dsm_filepath} {output_filepath}
        """

    def __createGdal2TileCommand(self, viewshed_filepath, output_folderpath, processes=8, tilesize=512):
        return f"""gdal2tiles.py --zoom={self.min_zoom}-{self.max_zoom} --tilesize={tilesize}
            --webviewer=none --no-kml --resampling=near --exclude --processes={processes}
            {viewshed_filepath} {output_folderpath}"""

    def __calculateRadiusViewshed(self) -> float:
        # Calculate how far viewshed should extend
        pt_radius = destination(self.radio.observer, self.radio.max_radius, 90)
        src = self.radio.observer.transform(DEFAULT_PROJECTION, clone=True)
        res = Point(pt_radius[0], pt_radius[1])
        res.srid = 4326
        res = res.transform(DEFAULT_PROJECTION, clone=True)
        return math.sqrt((src.x - res.x) * (src.x - res.x) + (src.y - res.y) * (src.y - res.y))

    def __renderViewshed(self, dsm_file, status_callback=None):
        with tempfile.NamedTemporaryFile(suffix=".tif") as output_temp:
            start = time.time()
            raw_command = self.__createRawGDALViewshedCommand(
                dsm_file.name, output_temp.name, DEFAULT_PROJECTION)
            filtered_command = shlex.split(raw_command)
            celery_task_subprocess_check_output_wrapper(filtered_command)

            TASK_LOGGER.info(f'compute viewshed: {time.time() - start}')
            start_tiling = time.time()

            if status_callback is not None:
                status_callback("Colorizing and Reprojecting",
                                self.__timeRemainingViewshed(2))

            self.__cropSector(output_temp)

            with tempfile.NamedTemporaryFile(suffix=".tif") as colorized_temp:
                self.__colorizeOutputViewshed(output_temp, colorized_temp)
                shutil.copy(colorized_temp.name, '/usr/src/app/output.tif')
                TASK_LOGGER.info(f'colorizing: {time.time() - start_tiling}')
                start = time.time()
                self.__reprojectViewshed(output_temp)
                TASK_LOGGER.info(f'reproject: {time.time() - start}')
                start = time.time()
                self.__createTileset(
                    colorized_temp, status_callback=status_callback)
                TASK_LOGGER.info(f'tileset: {time.time() - start}')
            TASK_LOGGER.info(f'tiling: {time.time() - start_tiling}')

    def __createTileset(self, tif_tempfile, status_callback=None):
        with tempfile.TemporaryDirectory() as tmp_dir:
            if status_callback is not None:
                status_callback("Tiling",
                                self.__timeRemainingViewshed(3))
            TASK_LOGGER.info(f'tiling started')
            start = time.time()
            self.__convert2Tiles(tif_tempfile.name, tmp_dir)
            TASK_LOGGER.info(f'finished tiling: {time.time() - start}')
            size = 0
            if status_callback is not None:
                status_callback("Loading results",
                                self.__timeRemainingViewshed(4))
            start = time.time()
            paths = []
            keys = []
            # Find all Tile Images
            for subdir, _, files in os.walk(tmp_dir):
                for file in files:
                    if file.endswith('.png'):
                        path = os.path.join(subdir, file)
                        regexpath = path.replace(tmp_dir, "")
                        z, y, x = re.findall('[0-9]+', regexpath)
                        tile = ViewshedTile(viewshed=self, zoom=z, y=y, x=x)
                        size += os.path.getsize(path)
                        tile.save()
                        paths.append(path)
                        keys.append(tile.upload_to_path(''))
            TASK_LOGGER.info(
                f'number of tiles: {len(paths)} tiles | size of tiles: {size}B')
            # Perform Bulk Upload of Tiles to S3 - performed in parallel is much faster
            writeMultipleS3Objects(keys, paths, ViewshedTile.bucket_name)
            TASK_LOGGER.info(f'finished uploading: {time.time() - start}')

    def __colorizeOutputViewshed(self, tif_viewshed_tempfile, output_colorized_tempfile):
        with rasterio.open(tif_viewshed_tempfile.name) as src:
            if self.mode == Viewshed.CoverageStatus.NORMAL:
                meta = src.meta.copy()
                meta.update({
                    'count': 4
                })
                with rasterio.open(output_colorized_tempfile.name, 'w', **meta) as dst:
                    layer = src.read(1)
                    for i in range(1, 5):
                        new_layer = np.zeros(layer.shape, dtype=np.uint8)
                        if i == 4:
                            new_layer[layer == 0] = 128
                        dst.write(new_layer, indexes=i)
            if self.mode == Viewshed.CoverageStatus.GROUND:
                meta = src.meta.copy()
                meta.update({
                    'count': 4,
                    'dtype': rasterio.uint8
                })
                with rasterio.open(output_colorized_tempfile.name, 'w', **meta) as dst:
                    layer = src.read(1)
                    for i in range(1, 5):
                        new_layer = np.zeros(layer.shape, dtype=np.uint8)
                        if i == 4:
                            new_layer[layer >= self.radio.default_cpe_height] = 128
                        dst.write(new_layer, indexes=i)

    def __cropSector(self, viewshed_image):
        if self.ap is None and self.sector is not None:
            with rasterio.open(viewshed_image.name) as ds:
                # Set output and crop variables
                nodata = None
                output_type = rasterio.uint8
                if self.mode == Viewshed.CoverageStatus.GROUND:
                    nodata = np.Inf
                    output_type = rasterio.float64
                # Reproject Sector Onto Tif
                sector = self.radio.geojson
                if sector.srid is None:
                    sector.srid = 4326
                # Perform Crop Operation
                sector = sector.transform(ds.crs.wkt, clone=True)
                out_image, out_transform = mask.mask(
                    ds, [json.loads(sector.json)], nodata=nodata, crop=True
                )
                # Write to File
                profile = ds.profile
                profile.data.update({'height': out_image.shape[1], 'width': out_image.shape[2]})
                with rasterio.open(viewshed_image.name, 'w', **profile) as dst:
                    dst.write(out_image.astype(output_type))

    def __reprojectViewshed(self, output_temp):
        # Load Output Viewshed TIF File
        dst_crs = 'EPSG:4326'
        start = time.time()
        with rasterio.open(output_temp.name) as src:
            transform, width, height = calculate_default_transform(
                src.crs, dst_crs, src.width, src.height, *src.bounds)
            kwargs = src.meta.copy()
            kwargs.update({
                'crs': dst_crs,
                'transform': transform,
                'width': width,
                'height': height
            })
            TASK_LOGGER.info(f'open: {time.time() - start}')

            # Create a transformed reprojection
            with tempfile.NamedTemporaryFile(suffix=".tif") as temp_transform:
                with rasterio.open(temp_transform.name, 'w', **kwargs) as dst:
                    for i in range(1, src.count + 1):
                        reproject(
                            source=rasterio.band(src, i),
                            destination=rasterio.band(dst, i),
                            src_transform=src.transform,
                            src_crs=src.crs,
                            dst_transform=transform,
                            dst_crs=dst_crs,
                            resampling=Resampling.nearest)
                temp_transform.seek(0)
                self.write_object(temp_transform, tif=True)
                TASK_LOGGER.info(f'reprojected: {time.time() - start}')

    def __convert2Tiles(self, tif_filepath, outputfolder):
        raw_command = self.__createGdal2TileCommand(tif_filepath, outputfolder)
        filtered_command = shlex.split(raw_command)
        subprocess.check_output(filtered_command, encoding="UTF-8")


class DSMAvailabilityException(Exception):
    pass


class ViewshedTile(TileModel):
    """
    Slippy Tile that is associated with Lidar point cloud
    """
    viewshed = models.ForeignKey(Viewshed, on_delete=models.CASCADE)
    bucket_name = 'isptoolbox-tilesets'

    class Meta:
        unique_together = [['x', 'y', 'zoom', 'viewshed']]

    def upload_to_path(instance, filename):
        prefix = "viewshed/tiles_test"
        if settings.PROD:
            prefix = "viewshed/tiles"
        return f"{prefix}/{instance.viewshed.uuid}/{instance.zoom}/{instance.x}/{instance.y}.png"

    tile = models.FileField(
        upload_to=upload_to_path,
        storage=S3Boto3Storage(bucket_name=bucket_name, location=''),
    )


@receiver(post_delete, sender=ViewshedTile)
def cleanup_tile(sender, instance, using, **kwargs):
    instance.tile.delete(save=False)


def convertViewshedRGBA(viewshed):
    im = Image.open(viewshed)
    img = np.asarray(im)
    numpy_image = np.zeros((im.size[1], im.size[0], 4), np.uint8)
    numpy_image[img == 0] = DEFAULT_OBSTRUCTED_COLOR

    rgbaimg = Image.fromarray(numpy_image.astype('uint8'), 'RGBA')
    rgbaimg.save(viewshed)
