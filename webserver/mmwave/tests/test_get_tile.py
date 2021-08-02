from django.test.testcases import TestCase
from IspToolboxApp.util.s3 import findPointCloudPrefix


class TestGetTilePathPrefix(TestCase):
    def test_get_prefix(self):
        val = findPointCloudPrefix('dsm/tiles/', 'MS_MSDeltaYazoo-Phase1_2009')
        print(val)
        self.assertTrue(len(val) > 0)
