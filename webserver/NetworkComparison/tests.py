# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase
from .util import squaredMetersToMiles
import sys
import math
import json
from NetworkComparison.NCTasks.osm_anchor_institution_task import fetchAnchorInstitutions
from NetworkComparison.NCTasks.buildings_mst import multiLinePrims
from django.contrib.gis.geos import GEOSGeometry

sampleAreaMeters = 684291.294401
sampleAreaMiles = 0.2642063458400304
floatEps = sys.float_info.epsilon


class UtilTests(TestCase):
    def test_sqmeter_to_sqmile(self):
        ans = squaredMetersToMiles(sampleAreaMeters)
        self.assertTrue(math.isclose(ans, sampleAreaMiles, abs_tol=floatEps))

    def test_gen_anchor_institutions(self):
        """
        Checks that polygon in Indianola, MS contains hospital and school
        """
        test_polygon_geojson = """{
            "type": "Polygon",
            "coordinates": [[
                [-90.64484596252441,33.46087611904247],
                [-90.65147638320923,33.45897855714156],
                [-90.65083265304565,33.45405544347556],
                [-90.6385588645935,33.45278433963828],
                [-90.63774347305298,33.458745834426644],
                [-90.64484596252441,33.46087611904247]
            ]]
        }"""
        geometry = GEOSGeometry(test_polygon_geojson)
        anchor_instituitions = fetchAnchorInstitutions(geometry)
        self.assertGreaterEqual(len(anchor_instituitions), 2)

    def test_min_span(self):
        """
            Checks that minimum spanning tree for a simple graph is correct
        """
        test_multi_line_json = """ {
            "coordinates": [
                [[0,0],[1,1]],
                [[0,0],[0,-1]],
                [[1,1],[2,2]],
                [[2,2],[0,1]],
                [[0,1],[1,1]],
                [[-1,0],[0,0]],
                [[2,2],[-1,0]]
            ]
        }
        """
        geoJson = json.loads(test_multi_line_json)
        ans = multiLinePrims(geoJson)
        expectedLength = 2*math.sqrt(2) + 3
        expectedNumEdges = 5
        self.assertEqual(expectedLength, ans['length'])
        self.assertEqual(expectedNumEdges, len(ans['mst']))
