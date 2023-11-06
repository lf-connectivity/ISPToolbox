# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase
from IspToolboxApp.util.validate_user_input import (
    validateUserInputMarketEvaluator, InvalidMarketEvaluatorRequest,
    MAXIMUM_NUM_COORDS
)
import json
import random


class TestValidateMarketEvaluatorUserInput(TestCase):
    VALID_GEOJSON_REQUEST = """
        {
            "coordinates": [[
                [-122.1962721852112,37.476619303113424],
                [-122.19630377633675,37.47147961778657],
                [-122.18827962949975,37.471855704303394],
                [-122.1962721852112,37.476619303113424]
            ]],
            "type": "Polygon"
        }"""
    LARGE_GEOJSON_REQUEST = """
        {
            "type": "Polygon",
            "coordinates": [[
                [-118.54248046874999,41.541477666790286],
                [-122.87109375,39.67337039176558],
                [-119.35546875000001,34.77771580360469],
                [-118.54248046874999,41.541477666790286]
            ]]
        }"""

    def test_valid_input(self):
        try:
            validateUserInputMarketEvaluator(self.VALID_GEOJSON_REQUEST)
        except Exception:
            self.assertTrue(False)
        self.assertTrue(True)

    def test_large_request(self):
        passed_test = False
        try:
            validateUserInputMarketEvaluator(self.LARGE_GEOJSON_REQUEST)
        except Exception as e:
            self.assertTrue(isinstance(e, InvalidMarketEvaluatorRequest))
            passed_test = True
        self.assertTrue(passed_test)

    def test_many_point_request(self):
        passed_test = False

        # generate many random points
        random.seed(2)
        coords = [
            [random.uniform(-123, -122), random.uniform(37, 38)]
            for _ in range(int(MAXIMUM_NUM_COORDS))
        ]
        coords.append(coords[0])
        geojson = {"coordinates": [coords], "type": "Polygon"}
        geojson_str = json.dumps(geojson)
        try:
            validateUserInputMarketEvaluator(geojson_str)
        except Exception as e:
            self.assertTrue(isinstance(e, InvalidMarketEvaluatorRequest))
            passed_test = True
        self.assertTrue(passed_test)
