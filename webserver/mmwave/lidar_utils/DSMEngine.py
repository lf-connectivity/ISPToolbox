import subprocess
import shlex
import tempfile


class DSMEngine:
    """
    This class is used to generate DSM files for users

    Args:
        polygon: GEOSGeometry - (Geometry Collection)
        sources: str - List of EPT Paths
    """
    def __init__(self, polygon, sources, projection=3857):
        self.polygon = polygon.transform(projection, clone=True)
        self.sources = sources

    def getDSM(self, resolution, filepath):
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
            # Iterate over all sources
            for source in self.sources:
                with tempfile.NamedTemporaryFile(suffix=".tif", delete=False, dir=tmp_dir) as tmp_tif:
                    files.append(tmp_tif.name)
                    query_json = self.__createQueryPipeline(resolution, tmp_tif.name, source)
                    command = shlex.split(
                        'pdal pipeline --stdin'
                    )
                    process = subprocess.Popen(command, stdin=subprocess.PIPE)
                    process.stdin.write(query_json.encode())
                    process.stdin.close()
                    process.wait()
            # Combine sources together
            process = self.__combineTifs(files, filepath)
            process.wait()
            return process

    def __combineTifs(self, files, output_filepath):
        cmd = shlex.split(f'gdal_merge.py -o {output_filepath} -of GTiff ' + " ".join(files))
        process = subprocess.Popen(cmd)
        return process

    def __createQueryPipeline(self, resolution, outputfilepath, source):
        """
        Creates the json string that pdal uses as a pipeline
        pdal docs: https://pdal.io/project/docs.html

        (has a statistical filter for outlier points )
        TODO achong: check LAS version to use classifications of high noise
        points
        TODO achong: combine multiple sources together
        """
        query_json = f"""{{
        "pipeline": [
            {{
                "type":"readers.ept",
                "filename": "{source}",
                "bounds": "{
                    [self.polygon.extent[0], self.polygon.extent[2]],
                    [self.polygon.extent[1], self.polygon.extent[3]]}",
                "resolution" : {resolution}
            }},
            {{
                "class": 7,
                "type": "filters.outlier",
                "method": "statistical",
                "mean_k": 12,
                "multiplier": 2.2
            }},
            {{
                "type": "filters.range",
                "limits": "Classification![7:7]"
            }},
            {{
                "type":"filters.crop",
                "polygon":"{self.polygon.wkt}"
            }},
            {{
                "type":"writers.gdal",
                "filename":"{outputfilepath}",
                "dimension":"Z",
                "data_type":"float",
                "output_type":"mean",
                "gdalopts":"COMPRESS=DEFLATE,ZLEVEL=9",
                "resolution": {resolution}
            }}
        ]}}"""
        return query_json
