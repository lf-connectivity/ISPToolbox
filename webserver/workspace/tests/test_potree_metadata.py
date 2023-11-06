# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.contrib.gis.geos.geometry import GEOSGeometry
from django.contrib.gis.geos.point import Point
from mmwave.models import EPTLidarPointCloud
from workspace.tests.test_geomodels import WorkspaceBaseTestCase

from workspace.utils.visualization_meta import get_workspace_potree_visualization_metadata


class PotreeMetadataTestCase(WorkspaceBaseTestCase):
    def setUp(self) -> None:
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
        super().setUp()
        self.test_ap.geojson = Point(-90.53717, 33.54512)
        self.test_ap.max_radius = 0.5
        self.test_ap.height = 50
        self.test_ap.save()

    def test_get_metadata(self):
        metadata = get_workspace_potree_visualization_metadata(self.test_ap)
        self.assertEqual(len(metadata['clouds']), 1)
