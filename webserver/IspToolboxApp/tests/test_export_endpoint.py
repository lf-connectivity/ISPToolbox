# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase, Client
import json


class TestKMZExportMarketEvaluator(TestCase):
    def test_kmz_export_endpoint(self):
        """
        Test Exporting Outline of Market Evaluator
        """
        client = Client()
        payload = json.dumps(
            {
                "shapes": True,
                "buildings": False,
                "include": {"type": "GeometryCollection", "geometries": [
                    {"coordinates": [
                        [[-122.5084755653811, 37.59777287648443],
                         [-122.50805088997956, 37.582461643770614],
                            [-122.48936517232276, 37.580274067702604],
                            [-122.5084755653811, 37.59777287648443]]
                    ], "type":"Polygon"}]}})
        response = client.post('/market-evaluator/export-np/', data=payload, content_type='text/plain'
                               )
        self.assertIs(response.status_code, 200)
