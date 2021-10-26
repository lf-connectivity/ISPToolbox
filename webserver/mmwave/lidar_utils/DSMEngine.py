import subprocess
import shlex
import shutil
import tempfile
from typing import Iterator

from django.contrib.gis.geos.geometry import GEOSGeometry
from mmwave.lidar_utils.SlippyTiles import addBufferToPolygon
from mmwave.models import EPTLidarPointCloud


class DSMEngine:
    """
    This class is used to generate DSM files for users

    Args:
        polygon: GEOSGeometry - (Geometry Collection)
        clouds: str - List of EPT Paths
    """

    def __init__(self, polygon: GEOSGeometry, clouds: Iterator[EPTLidarPointCloud], projection=3857):
        self.original_polygon = polygon
        self.transformed_polygon = polygon.transform(projection, clone=True)
        self.clouds = clouds

    def getDSM(self, resolution, filepath, filter_outliers=False):
        """
        Get DSM for polygon of interest and put it in the filepath as a geotiff

        Args:
            resolution: float - resolution of output raster (meters)
            filepath: file-like object to put geotiff (e.g. tempfile)
        Returns:
            a process handle of the pdal request

        Raises:
            not sure lol
        """
        with tempfile.TemporaryDirectory() as tmp_dir:
            files = []
            # Iterate over all clouds
            for cloud in self.clouds:
                with tempfile.NamedTemporaryFile(suffix=".tif", delete=False, dir=tmp_dir) as tmp_tif:
                    files.append(tmp_tif.name)
                    query_json = self.__createQueryPipeline(
                        resolution, tmp_tif.name, cloud, filter_outliers)
                    command = shlex.split(
                        'pdal pipeline --stdin'
                    )
                    process = subprocess.Popen(command, stdin=subprocess.PIPE)
                    process.stdin.write(query_json.encode())
                    process.stdin.close()
                    process.wait()
            if len(files) == 1:
                shutil.copy(files[0], filepath)
            else:
                # Combine clouds together
                process = self.__combineTifs(files, filepath)
                process.wait()
            return process

    def __combineTifs(self, files, output_filepath):
        cmd = shlex.split(f"""
            gdal_merge.py -o {output_filepath} -of GTiff -co COMPRESS=DEFLATE -co ZLEVEL=9
        """ + " ".join(files))
        process = subprocess.Popen(cmd)
        return process

    def __createQueryPipeline(self, resolution: float, outputfilepath: str, cloud: EPTLidarPointCloud, filter_outliers: bool):
        """
        Creates the json string that pdal uses as a pipeline
        pdal docs: https://pdal.io/project/docs.html

        (has a statistical filter for outlier points )
        """
        source = cloud.url

        # If we are going to filter outlilers we should load data a little outside the boundary
        source_bounding_box = self.transformed_polygon
        if filter_outliers:
            source_bounding_box = addBufferToPolygon(self.transformed_polygon)
        outlier_filter = f"""
        {{
            "class": 18,
            "type": "filters.outlier",
            "method": "statistical",
            "mean_k": 12,
            "multiplier": 2.2
        }},
        {{
            "type": "filters.range",
            "limits": "Classification![18:18]"
        }},
        """
        query_json = f"""{{
        "pipeline": [
            {{
                "type":"readers.ept",
                "filename": "{source}",
                "bounds": "{
                    [source_bounding_box.extent[0], source_bounding_box.extent[2]],
                    [source_bounding_box.extent[1], source_bounding_box.extent[3]]}",
                "resolution" : {resolution}
            }},
            {outlier_filter if filter_outliers else ''}
            {{
                "type":"filters.crop",
                "polygon":"{self.transformed_polygon.wkt}"
            }},
            {{
                "type":"writers.gdal",
                "filename":"{outputfilepath}",
                "dimension":"Z",
                "data_type":"float",
                "output_type":"max",
                "gdalopts":"COMPRESS=DEFLATE,ZLEVEL=9",
                "resolution": {resolution}
            }}
        ]}}"""
        return query_json
