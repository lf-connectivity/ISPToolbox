from django.test import TestCase
from .tasks import getElevationProfile, \
    selectLatestProfile
from mmwave.lidar_utils.pdal_templates import getLidarPointsAroundLink
from django.contrib.gis.geos import Point, LineString

tx_point = [-75.5376148223877, 39.16653673334675]
rx_point = [-75.5691146850586, 39.159016668347725]

test_rx_pt_PuertoRico = [-66.10818070326883, 18.416250557878442]
test_tx_pt_PuertoRico = [-66.10326724720488, 18.415117149683724]


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
        pts, count = getLidarPointsAroundLink(path, link, 3857, 5)
        self.assertEqual(count, 484)

    def test_selectLatestLidarRegex(self):
        class cloud:
            def __init__(self, url):
                self.url = url

        urls = [
            'USGS_LPC_PR_PuertoRico_2015_LAS_2018',
            'USGS_LPC_PR_PuertoRico_2016_LAS_2017',
            'PR_PuertoRico_2016_LAS_2017',
            'test_no_year'
        ]
        latest_cloud = selectLatestProfile([cloud(url) for url in urls])
        self.assertEqual(latest_cloud.url, urls[0])
