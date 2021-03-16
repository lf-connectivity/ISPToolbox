import pdal


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
            number of points the pipeline processed?

        Raises:
            not sure lol
        """
        query_json = self.__createQueryPipeline(resolution, filepath)
        pipeline = pdal.Pipeline(query_json)
        count = pipeline.execute()
        return count

    def __createQueryPipeline(self, resolution, outputfilepath):
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
                "filename": "{self.sources[0]}",
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
                "resolution": {resolution}
            }}
        ]}}"""
        return query_json
