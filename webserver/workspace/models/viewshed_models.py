from django.db import models
from django.contrib.gis.geos import Point
from django.conf import settings
from IspToolboxApp.util.s3 import S3PublicExportMixin
from workspace.models.network_models import AccessPointLocation
from workspace.utils.geojson_circle import destination
from mmwave.models import EPTLidarPointCloud
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
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


DEFAULT_PROJECTION = 3857
DEFAULT_OBSTRUCTED_COLOR = [0, 0, 0, 128]
PIL.Image.MAX_IMAGE_PIXELS = 20_000 * 20_000


class ViewshedModel(models.Model, S3PublicExportMixin):
    """
    Viewshed computation result
    """
    ap = models.OneToOneField(AccessPointLocation, on_delete=models.CASCADE)
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

    def calculate_hash(self):
        """
        This function generates a hash to help cache viewshed results
        """
        return f'{self.ap.height},{self.ap.max_radius},{self.ap.geojson.x},{self.ap.geojson.y},{self.ap.default_cpe_height}'

    def result_cached(self) -> bool:
        return self.hash == self.calculate_hash()

    def delete(self):
        self.delete_object()
        super(ViewshedModel, self).delete()

    def get_s3_key(self, **kwargs) -> str:
        if settings.PROD:
            key = 'viewshed/viewshed-tower-' + str(self.ap.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        else:
            key = 'viewshed/test-viewshed-tower-' + str(self.ap.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        return key

    def createRawGDALViewshedCommand(self, dsm_filepath, output_filepath, dsm_projection):
        """
        Generate shell commmand to run gdal_viewshed: requires gdal-bin > 3.1.0

        documentation: https://gdal.org/programs/gdal_viewshed.html
        """
        transformed_observer = self.ap.geojson.transform(dsm_projection, clone=True)
        return f"""gdal_viewshed -b 1 -ov 1
            -oz {self.ap.height} -tz {self.ap.default_cpe_height} -md {self.calculateRadiusViewshed()}
            -ox {transformed_observer.x} -oy {transformed_observer.y} -om {self.mode}
            {dsm_filepath} {output_filepath}
        """

    def calculateRadiusViewshed(self) -> float:
        # Calculate how far viewshed should extend
        pt_radius = destination(self.ap.geojson, self.ap.max_radius, 90)
        src = self.ap.geojson.transform(DEFAULT_PROJECTION, clone=True)
        res = Point(pt_radius[0], pt_radius[1])
        res.srid = 4326
        res = res.transform(DEFAULT_PROJECTION, clone=True)
        return math.sqrt((src.x - res.x) * (src.x - res.x) + (src.y - res.y) * (src.y - res.y))

    def calculateViewshed(self) -> None:
        aoi = self.ap.getDSMExtentRequired()
        dsm_engine = DSMTileEngine(aoi, EPTLidarPointCloud.query_intersect_aoi(aoi))
        with tempfile.NamedTemporaryFile(mode='w+b', suffix=".tif") as dsm_file:
            start = time.time()
            dsm_engine.getDSM(dsm_file.name)
            logging.info(f'dsm download: {time.time() - start}')
            start = time.time()
            self.renderViewshed(dsm_file=dsm_file)
            logging.info(f'compute viewshed and upload: {time.time() - start}')
        self.hash = self.calculate_hash()
        self.save(update_fields=['hash'])

    def renderViewshed(self, dsm_file):
        # get object from database
        with tempfile.NamedTemporaryFile(suffix=".tif") as output_temp:
            raw_command = self.createRawGDALViewshedCommand(dsm_file.name, output_temp.name, DEFAULT_PROJECTION)
            filtered_command = shlex.split(raw_command)
            subprocess.check_output(filtered_command, encoding="UTF-8")

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


def convertViewshedRGBA(viewshed):
    im = Image.open(viewshed)
    img = np.asarray(im)
    numpy_image = np.zeros((im.size[1], im.size[0], 4), np.uint8)
    numpy_image[img == 0] = DEFAULT_OBSTRUCTED_COLOR

    rgbaimg = Image.fromarray(numpy_image.astype('uint8'), 'RGBA')
    rgbaimg.save(viewshed)
