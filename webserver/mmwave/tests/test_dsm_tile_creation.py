# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase
from mmwave.scripts.create_dsm_for_ept import createTileDSM
from mmwave.models import EPTLidarPointCloud, LidarDSMTileModel

from django.contrib.gis.geos import GEOSGeometry
from mmwave.lidar_utils.SlippyTiles import getTiles, DEFAULT_OUTPUT_ZOOM

SUNFLOWER_DATASET_NAME = "MS_MSDeltaYazoo-Phase1_2009"
SUNFLOWER_DATASET_URL = "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MS_MSDeltaYazoo-Phase1_2009/ept.json"

POLYGON_SUNFLOWER = """{
    "type": "Polygon",
    "coordinates": [
        [[-90.53806185722351,33.54466303380954],
        [-90.53780972957611,33.54466303380954],
        [-90.53780972957611,33.54488211266755],
        [-90.53806185722351,33.54488211266755],
        [-90.53806185722351,33.54466303380954]]
    ]
}"""
NOISY_DATASET_NAME = "USGS_LPC_TX_West_Central_B14_2018_LAS_2019"
NOISY_DATASET_URL = "https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_TX_West_Central_B14_2018_LAS_2019/ept.json"
NOISY_POLYGON = """{
    "type": "Polygon",
    "coordinates": [
        [[-98.59587907791138,33.871288545602845],
        [-98.59502077102661,33.871288545602845],
        [-98.59502077102661,33.87194773973663],
        [-98.59587907791138,33.87194773973663],
        [-98.59587907791138,33.871288545602845]]
    ]
}"""


class TestLidarDSMTileCreation(TestCase):
    """
    Test Tasks and functions to generate DSM Tiles from LiDAR Point Clouds
    """
    def test_non_noisy_point_clouds(self):
        """
        Test DSM Tile generatino from non-noisy point cloud data
        """
        polygon_json, dataset_name, dataset_url, noisy = (
            POLYGON_SUNFLOWER, SUNFLOWER_DATASET_NAME, SUNFLOWER_DATASET_URL, False)
        polygon = GEOSGeometry(polygon_json)
        tiles = getTiles(polygon, DEFAULT_OUTPUT_ZOOM)
        cloud = EPTLidarPointCloud(
            name=dataset_name, count=1,
            url=dataset_url,
            srs=3857,
            boundary=polygon, noisy_data=noisy
        )
        cloud.save()
        new_tiles = []
        for tile in tiles:
            new_tiles.append(createTileDSM(
                tile, DEFAULT_OUTPUT_ZOOM, cloud.id))
            new_tile = LidarDSMTileModel.objects.get(
                    pk=new_tiles[-1])
            self.assertTrue(new_tile.tile.name)
        self.assertTrue(len(new_tiles) > 0)

    def test_noisy_point_clouds(self):
        """
        Test DSM Tile generation from noisy point cloud data
        """
        polygon_json, dataset_name, dataset_url, noisy = (
            NOISY_POLYGON, NOISY_DATASET_NAME, NOISY_DATASET_URL, True)
        polygon = GEOSGeometry(polygon_json)
        tiles = getTiles(polygon, DEFAULT_OUTPUT_ZOOM)
        cloud = EPTLidarPointCloud(
            name=dataset_name, count=1,
            url=dataset_url,
            srs=3857,
            boundary=polygon, noisy_data=noisy
        )
        cloud.save()
        new_tiles = []
        for tile in tiles:
            new_tiles.append(createTileDSM(
                tile, DEFAULT_OUTPUT_ZOOM, cloud.id))
            new_tile = LidarDSMTileModel.objects.get(
                    pk=new_tiles[-1])
            self.assertTrue(new_tile.tile.name)
        self.assertTrue(len(new_tiles) > 0)
