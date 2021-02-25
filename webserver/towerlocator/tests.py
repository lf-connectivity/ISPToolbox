from django.test import TestCase
from .helpers import getViewShed


class TestTowerLocatorV2(TestCase):
    def test_get_viewshed(self):
        resp = getViewShed(37.5124, -121.8805, 20, 10, 5)
        self.assertEquals(resp['coverage']['type'], "GeometryCollection")
        self.assertTrue(len(resp['coverage']['geometries']) > 0)
