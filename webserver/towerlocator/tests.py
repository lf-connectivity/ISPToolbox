from django.test import TestCase
from .helpers import getViewShed


class TestTowerLocatorV2(TestCase):
    def test_get_viewshed(self):
        resp = getViewShed(37.5124, -121.8805, 20, 10, 5)
        self.assertTrue(resp.get('error') is not None)
        if resp.get('error') == 0:
            self.assertEquals(resp['coverage']['type'], "GeometryCollection")
            self.assertTrue(len(resp['coverage']['geometries']) > 0)
        else:
            self.assertTrue(resp.get('error') == -1)
