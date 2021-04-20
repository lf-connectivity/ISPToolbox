from django.test import TestCase, TransactionTestCase, Client
from mmwave.tasks import getElevationProfile
from mmwave.tasks.link_tasks import MAXIMUM_NUM_POINTS_RETURNED
from mmwave.lidar_utils.pdal_templates import (
    getLidarPointsAroundLink, takeMaxHeightAtDistance
)
from mmwave.lidar_utils.LidarEngine import LidarEngine
from mmwave.lidar_utils.DSMEngine import DSMEngine
import tempfile
import os
from django.contrib.gis.geos import Point, LineString, GEOSGeometry
from mmwave.models import EPTLidarPointCloud

import unittest.mock as mock

tx_point = [-75.5376148223877, 39.16653673334675]
rx_point = [-75.5691146850586, 39.159016668347725]

test_rx_pt_PuertoRico = [-66.10818070326883, 18.416250557878442]
test_tx_pt_PuertoRico = [-66.10326724720488, 18.415117149683724]


class TestDSMExport(TestCase):
    def test_create_dsm(self):
        """
        Tests DSMEngine, verifies that a tif file is produced from a valid request
        """
        polygon = GEOSGeometry("""
        {
        "type": "Polygon",
        "coordinates": [
          [
            [
              -90.53931713104248,
              33.547546782478754
            ],
            [
              -90.54167747497559,
              33.54085812669445
            ],
            [
              -90.53605556488037,
              33.53824690667674
            ],
            [
              -90.53009033203125,
              33.54246774356695
            ],
            [
              -90.53931713104248,
              33.547546782478754
            ]
          ]
        ]
      }""")
        ept_sources = ["https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MS_MSDeltaYazoo-Phase1_2009/ept.json"]
        dsm_engine = DSMEngine(polygon, ept_sources)
        created_dsm = False
        with tempfile.NamedTemporaryFile(suffix='.tif') as temp:
            dsm_engine.getDSM(20, temp.name)
            self.assertTrue(os.path.getsize(temp.name) > 0)
            created_dsm = True
        self.assertTrue(created_dsm)


class SimplePageLoadTest(TestCase):
    def test_los_check_simple(self):
        """
        Verifies that the stand alone los check view will load successfully
        """
        client = Client()
        response = client.get('/demo/los-check/')
        self.assertEqual(response.status_code, 200)

    def test_los_check_iframe(self):
        """
        Verifies that the iframed view will respond successfully and allow
        itself to be iframed into facebook.com
        """
        client = Client()
        response = client.get('/demo/los-check/?id=1791316560&lat=37.4553&lon=-122.179')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.has_header('x-frame-options'))


class LiDARTestCase(TransactionTestCase):

    geojson1 = """{
        "type": "Polygon",
        "coordinates":[[
        [-121.8218994140625,38.009959746807006],
        [-121.82910919189453,37.984798440032684],
        [-121.7673110961914,37.97640941966381],
        [-121.77074432373047,38.00157360367438],
        [-121.8218994140625,38.009959746807006]
        ]]
      }"""
    geojson2 = """{
        "type": "Polygon",
        "coordinates": [[
              [-121.7717742919922,38.002385207833235],
              [-121.77864074707031,37.97857441995155],
              [-121.75151824951172,37.975056262053606],
              [-121.74705505371094,38.00103252924477],
              [-121.7717742919922,38.002385207833235]
            ]]
    }"""
    geojson3 = """{
        "type": "Polygon",
        "coordinates": [
          [
            [-121.74808502197267,38.00049145082287],
            [-121.75872802734375,37.972349871995256],
            [-121.73091888427733,37.972620515491336],
            [-121.72782897949219,37.99940928200236],
            [-121.74808502197267,38.00049145082287]
          ]
        ]
      }
    """
    pt1 = [-121.79786682128905, 37.99291593373803]
    pt2 = [-121.74293518066406, 37.9807393563754]

    def test_get_segments(self):
        """
        This test verifies that we can properly return line segments using year as a priority
        """
        cloud1 = EPTLidarPointCloud(
            name="cloud1", count=1,
            url="https://isptoolbox.com/ptcloud_2002_2019.json",
            srs=3857,
            boundary=GEOSGeometry(LiDARTestCase.geojson1)
        )
        cloud2 = EPTLidarPointCloud(
            name="cloud2", count=2,
            url="https://isptoolbox.com/ptcloud_2012.json",
            srs=3857,
            boundary=GEOSGeometry(LiDARTestCase.geojson2)
        )
        cloud3 = EPTLidarPointCloud(
            name="cloud3", count=3,
            url="https://isptoolbox.com/ptcloud_2010.json",
            srs=3857,
            boundary=GEOSGeometry(LiDARTestCase.geojson3)
        )
        cloud1.save(), cloud2.save(), cloud3.save()
        tx = Point(LiDARTestCase.pt1)
        rx = Point(LiDARTestCase.pt2)
        link = LineString((tx, rx))
        # TODO: write better test case
        # le = LidarEngine(link, LIDAR_RESOLUTION_DEFAULTS[LidarResolution.LOW], MAXIMUM_NUM_POINTS_RETURNED)

        self.assertTrue(link.dims > 0)

    def test_dedup_lidar_profile(self):
        """
        Check that lidar profile deduplication works as intended
        """
        heights = [0, 1, 3, 10, 5]
        distances = [0, 1, 1, 1, 2]
        d, h = takeMaxHeightAtDistance(distances, heights)
        self.assertEqual(len(d), 3)
        self.assertEqual(len(h), 3)
        self.assertEqual(h[1], 10)


class ElevationProfileTestCase(TestCase):

    def test_GetElevation(self):
        """
        Relies on external API - google elevation profile
        """
        tx = Point(tx_point[0], tx_point[1])
        rx = Point(rx_point[0], rx_point[1])
        profile = getElevationProfile(tx, rx)
        self.assertTrue(profile is not None)
        self.assertTrue(len(profile) > 4)

    def test_GetLidarProfile(self):
        """
        Relies on external API - S3 EPT hosting of 3DEP
        """
        path = 'https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PR_PRVI_E_2018/ept.json'
        tx = Point(
            test_tx_pt_PuertoRico[0],
            test_tx_pt_PuertoRico[1]
        )
        rx = Point(
            test_rx_pt_PuertoRico[0],
            test_rx_pt_PuertoRico[1]
        )
        link = LineString([tx, rx])
        link.srid = 4326
        pts, count, bounds, link = getLidarPointsAroundLink(path, link, 3857, 5, num_samples=MAXIMUM_NUM_POINTS_RETURNED)
        self.assertTrue(count > 10)


class LidarEngineTestCase(TestCase):

    def lidar_engine_rename_sources_workflow(self, s_year, e_year, source_name, expected_rename):
        with mock.patch('mmwave.lidar_utils.lidar_engine_queries.get_collection_years_for_project_id') as query_mock:
            query_mock.return_value = (s_year, e_year)
            rename = LidarEngine._renameSource(source_name)
            self.assertEqual(expected_rename, rename)

    def test_GetSourcesTwoYears(self):
        self.lidar_engine_rename_sources_workflow(
            None,
            None,
            'USGS_LPS_CA_LosAngeles_2016_LAS_2018',
            'USGS_LPS_CA_LosAngeles (Collected 2016-2018)'
        )

    def test_GetSourcesOneYearSameYears(self):
        self.lidar_engine_rename_sources_workflow(
            '2009',
            '2009',
            'MS_MSDeltaYahoo-Phasel_2009',
            'MS_MSDeltaYahoo-Phasel (Collected 2009)',
        )

    def test_GetSourcesOneYearDifferentYears(self):
        self.lidar_engine_rename_sources_workflow(
            '2009',
            '2010',
            'MS_MSDeltaYahoo-Phasel_2009',
            'MS_MSDeltaYahoo-Phasel (Collected 2009-2010)'
        )

    def test_GetSourcesOneYearNoDatabaseInfo(self):
        self.lidar_engine_rename_sources_workflow(
            None,
            None,
            'MS_MSDeltaYahoo-Phasel_2009',
            'MS_MSDeltaYahoo-Phasel (Collected 2009)'
        )

    def test_GetSourcesNoYearsDatabaseInfoExistsSameYears(self):
        self.lidar_engine_rename_sources_workflow(
            '2009',
            '2009',
            'IA_FullState',
            'IA_FullState (Collected 2009)'
        )

    def test_GetSourcesNoYearsDatabaseInfoExistsDifferentYears(self):
        self.lidar_engine_rename_sources_workflow(
            '2009',
            '2010',
            'IA_FullState',
            'IA_FullState (Collected 2009-2010)'
        )

    def test_GetSourcesNoYearsNoDatabaseInfo(self):
        self.lidar_engine_rename_sources_workflow(
            None,
            None,
            'IA_FullState',
            'IA_FullState'
        )
