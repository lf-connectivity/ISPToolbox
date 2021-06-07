from django.contrib.gis.geos.geometry import GEOSGeometry
from django.contrib.gis.geos.point import Point
from .test_geomodels import WorkspaceBaseTestCase
from workspace.models import Viewshed
from mmwave.models import EPTLidarPointCloud


class ViewshedTestCase(WorkspaceBaseTestCase):
    def setUp(self):
        super().setUp()
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
        self.test_cloud = EPTLidarPointCloud(
            name="MS_MSDeltaYazoo-Phase1_2009", count=1,
            url="https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MS_MSDeltaYazoo-Phase1_2009/ept.json",
            srs=3857,
            boundary=polygon
        )
        self.test_cloud.save()
        return

    def test_session_duplication(self):
        """
        Test creation of tiles for viewshed
        """
        self.test_ap.geojson = Point(-90.53717, 33.54512)
        self.test_ap.max_radius = 0.5
        self.test_ap.height = 50
        self.test_ap.save()
        self.viewshed = Viewshed(ap=self.test_ap)
        self.viewshed.save()
        self.viewshed.calculateViewshed()
        self.assertTrue(len(self.viewshed.createJWT()) > 0)
