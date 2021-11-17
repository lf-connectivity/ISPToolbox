from django.test.testcases import TestCase
from IspToolboxApp.util.s3 import findPointCloudPrefix


class TestGetTilePathPrefix(TestCase):
    def test_get_prefix(self):
        val = findPointCloudPrefix('dsm/tiles/', 'MS_MSDeltaYazoo-Phase1_2009')
        self.assertEqual(val, "dsm/tiles/4769-MS_MSDeltaYazoo-Phase1_2009/")
        print(val)
        self.assertTrue(len(val) > 0)
        val = findPointCloudPrefix('dsm/tiles/', 'MO_WestCentral_2_2018')
        self.assertEqual(val, "dsm/tiles/5951-MO_WestCentral_2_2018/")
        print(val)
        self.assertTrue(len(val) > 0)
