from django.db import models
from django.contrib.gis.geos import Point
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage
from IspToolboxApp.util.s3 import S3PublicExportMixin
from django.db.models.signals import post_delete
from django.dispatch import receiver
from workspace.models.network_models import AccessPointLocation
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
from rasterio import shutil
from rasterio.warp import calculate_default_transform, reproject, Resampling
import time
import logging
import os
import re


DEFAULT_PROJECTION = 3857
DEFAULT_OBSTRUCTED_COLOR = [0, 0, 0, 128]
PIL.Image.MAX_IMAGE_PIXELS = 20_000 * 20_000


class Viewshed(models.Model, S3PublicExportMixin):
    """
    Viewshed computation result
    """
    ap = models.OneToOneField(AccessPointLocation, on_delete=models.CASCADE)
    uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, unique=True)
    hash = models.CharField(
        max_length=255,
        help_text="""
            This hash helps determine if the AP has already been computed.
        """
    )
    created = models.DateTimeField(auto_now_add=True)

    class CoverageStatus(models.TextChoices):
        VISIBLE = "VISIBLE"
        DEM = "DEM"
        GROUND = "GROUND"
        NORMAL = "NORMAL"

    mode = models.CharField(
        default=CoverageStatus.NORMAL,
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
                "exp": datetime.datetime.utcnow() + datetime.timedelta(days=3)  # token is good for 3 days
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

    def calculate_hash(self):
        """
        This function generates a hash to help cache viewshed results
        """
        return f'{self.ap.height},{self.ap.max_radius},{self.ap.geojson.x},{self.ap.geojson.y},{self.ap.default_cpe_height}'

    def result_cached(self) -> bool:
        return self.hash == self.calculate_hash()

    def delete(self):
        self.delete_object()
        super(Viewshed, self).delete()

    def get_s3_key(self, **kwargs) -> str:
        if settings.PROD:
            key = 'viewshed/viewshed-tower-' + str(self.ap.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        else:
            key = 'viewshed/test-viewshed-tower-' + str(self.ap.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        return key

    def translate_dtm_height_to_dsm_height(self) -> float:
        point = self.ap.geojson
        dtm = getDTMPoint(point)
        tile_engine = DSMTileEngine(point, EPTLidarPointCloud.query_intersect_aoi(point))
        dsm = tile_engine.getSurfaceHeight(point)
        return self.ap.height + dtm - dsm

    def calculateViewshed(self) -> None:
        """
        Compute Viewshed of Access Point
        """
        # Delete all tiles from previous calculations
        aoi = self.ap.getDSMExtentRequired()
        dsm_engine = DSMTileEngine(aoi, EPTLidarPointCloud.query_intersect_aoi(aoi))
        with tempfile.NamedTemporaryFile(mode='w+b', suffix=".tif") as dsm_file:
            start = time.time()
            dsm_engine.getDSM(dsm_file.name)
            logging.info(f'dsm download: {time.time() - start}')
            start = time.time()
            self.__renderViewshed(dsm_file=dsm_file)
            logging.info(f'compute viewshed and upload: {time.time() - start}')
        self.hash = self.calculate_hash()
        self.save(update_fields=['hash'])

    def __createRawGDALViewshedCommand(self, dsm_filepath, output_filepath, dsm_projection):
        """
        Generate shell commmand to run gdal_viewshed: requires gdal-bin > 3.1.0

        documentation: https://gdal.org/programs/gdal_viewshed.html
        """
        transformed_observer = self.ap.geojson.transform(dsm_projection, clone=True)
        transformed_height = self.translate_dtm_height_to_dsm_height()
        return f"""gdal_viewshed -b 1 -ov 1
            -oz {transformed_height} -tz {self.ap.default_cpe_height} -md {self.__calculateRadiusViewshed()}
            -ox {transformed_observer.x} -oy {transformed_observer.y} -om {self.mode}
            {dsm_filepath} {output_filepath}
        """

    def __createGdal2TileCommand(self, viewshed_filepath, output_folderpath):
        return f"""gdal2tiles.py {viewshed_filepath} {output_folderpath}"""

    def __calculateRadiusViewshed(self) -> float:
        # Calculate how far viewshed should extend
        pt_radius = destination(self.ap.geojson, self.ap.max_radius, 90)
        src = self.ap.geojson.transform(DEFAULT_PROJECTION, clone=True)
        res = Point(pt_radius[0], pt_radius[1])
        res.srid = 4326
        res = res.transform(DEFAULT_PROJECTION, clone=True)
        return math.sqrt((src.x - res.x) * (src.x - res.x) + (src.y - res.y) * (src.y - res.y))

    def __renderViewshed(self, dsm_file):
        with tempfile.NamedTemporaryFile(suffix=".tif") as output_temp:
            raw_command = self.__createRawGDALViewshedCommand(dsm_file.name, output_temp.name, DEFAULT_PROJECTION)
            filtered_command = shlex.split(raw_command)
            subprocess.check_output(filtered_command, encoding="UTF-8")

            with tempfile.NamedTemporaryFile(suffix=".tif") as colorized_temp:
                self.__colorizeOutputViewshed(output_temp, colorized_temp)
                self.__reprojectViewshed(output_temp)
                self.__createTileset(colorized_temp)

    def __createTileset(self, tif_tempfile):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self.__convert2Tiles(tif_tempfile.name, tmp_dir)
            for subdir, _, files in os.walk(tmp_dir):
                for file in files:
                    if file.endswith('.png'):
                        path = os.path.join(subdir, file)
                        regexpath = path.replace(tmp_dir, "")
                        z, y, x = re.findall('[0-9]+', regexpath)
                        tile = ViewshedTile(viewshed=self, zoom=z, y=y, x=x)
                        with open(path, 'rb') as fp:
                            tile.tile.save(f'{tile.pk}', fp)

    def __colorizeOutputViewshed(self, tif_viewshed_tempfile, output_colorized_tempfile):
        with rasterio.open(tif_viewshed_tempfile.name) as src:
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

    def __reprojectViewshed(self, output_temp):
        # Load Output Viewshed TIF File
        dst_crs = 'EPSG:4326'
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

                # convert reprojected file to PNG
                with tempfile.NamedTemporaryFile(suffix=".png") as raster_temp:
                    shutil.copy(
                        temp_transform.name,
                        raster_temp.name,
                        driver='PNG'
                    )
                    convertViewshedRGBA(raster_temp.name)
                    self.write_object(raster_temp)

    def __convert2Tiles(self, tif_filepath, outputfolder):
        raw_command = self.__createGdal2TileCommand(tif_filepath, outputfolder)
        filtered_command = shlex.split(raw_command)
        subprocess.check_output(filtered_command, encoding="UTF-8")


class ViewshedTile(TileModel):
    """
    Slippy Tile that is associated with Lidar point cloud
    """
    viewshed = models.ForeignKey(Viewshed, on_delete=models.CASCADE)
    bucket_name = 'isptoolbox-tilesets'

    def upload_to_path(instance, filename):
        prefix = "viewshed/tiles_test"
        if settings.PROD:
            prefix = "viewshed/tiles"
        return f"{prefix}/{instance.viewshed.uuid}/{instance.zoom}/{instance.x}/{instance.y}.png"

    tile = models.FileField(
        upload_to=upload_to_path,
        storage=S3Boto3Storage(bucket_name=bucket_name),
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
