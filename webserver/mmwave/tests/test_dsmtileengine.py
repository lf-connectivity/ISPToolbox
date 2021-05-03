from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
from mmwave.models import EPTLidarPointCloud
import tempfile
import os

polygon = GEOSGeometry("""
        {
        "type": "Polygon",
        "coordinates": [
          [
            [
              -122.14946687221527,
              37.485011083264226
            ],
            [
              -122.14919328689575,
              37.485011083264226
            ],
            [
              -122.14919328689575,
              37.48527500025218
            ],
            [
              -122.14946687221527,
              37.48527500025218
            ],
            [
              -122.14946687221527,
              37.485011083264226
            ]
          ]
        ]
      }
    }""")


class TestDsmTileEngine(TestCase):
    def setUp(self):
        self.test_cloud = EPTLidarPointCloud(
            name="ARRA-CA_SanFranCoast_2010", count=1,
            url="https://isptoolbox.com/ptcloud_2002_2019.json",
            srs=3857,
            boundary=polygon
        )
        self.test_cloud.save()
        pass

    def test_dsm_tile_load(self):
        dsm_engine = DSMTileEngine(polygon, [self.test_cloud])
        created_dsm = False
        with tempfile.NamedTemporaryFile(suffix='.tif') as tmp_tif:
            dsm_engine.getDSM(tmp_tif.name)
            self.assertTrue(os.path.getsize(tmp_tif.name) > 0)
            created_dsm = True
        self.assertTrue(created_dsm)
