from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry
from mmwave.lidar_utils.SlippyTiles import getTiles, getBoundaryofTile

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


class TestSlippyTilesUtil(TestCase):
    def setUp(self):
        pass

    def test_boundary_to_tiles(self):
        tiles = getTiles(polygon, 18)
        self.assertTrue(len(tiles) > 0)

    def test_tile_to_boundary(self):
        tiles = getTiles(polygon, 18)
        self.assertTrue(len(tiles) > 0)
        boundary = getBoundaryofTile(*tiles[0], 18)
        print(boundary)
        self.assertTrue(isinstance(boundary, GEOSGeometry))
