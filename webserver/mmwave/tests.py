from django.test import TestCase
from .tasks import getElevationProfile
from django.contrib.gis.geos import Point

tx_point = [-75.5376148223877, 39.16653673334675]
rx_point = [-75.5691146850586, 39.159016668347725]


# Create your tests here.
class ElevationProfileTestCase(TestCase):
    def test_GetElevation(self):
        tx = Point(tx_point[0], tx_point[1])
        rx = Point(rx_point[0], rx_point[1])
        profile = getElevationProfile(tx, rx)
        self.assertTrue(profile is not None)
        self.assertTrue(len(profile) > 4)
