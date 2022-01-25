from django.contrib.auth import get_user_model
from django.contrib.gis.geos.linestring import LineString
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_204_NO_CONTENT,
    HTTP_400_BAD_REQUEST,
    HTTP_404_NOT_FOUND,
)
from rest_framework.test import APIClient
import json
from uuid import UUID, uuid4

from workspace import geojson_utils
from workspace.models import (
    AccessPointLocation,
    CPELocation,
    APToCPELink,
    WorkspaceMapSession,
    CoverageArea,
    PointToPointLink,
    AccessPointSector,
)
from workspace.models.cloudrf_models import CloudRFAsyncTaskModel
from workspace.models.model_constants import FeatureType, M_2_FT
from workspace.models import (
    AccessPointSerializer,
    CPESerializer,
    APToCPELinkSerializer,
    CoverageAreaSerializer,
    AccessPointSectorSerializer,
)


################################################################################
#  UNIVERSAL CONSTANTS
################################################################################

JSON_CONTENT_TYPE = "application/json"


################################################################################
#  TEST CASE DEFAULTS
################################################################################

DEFAULT_USERNAME = "testuser"
DEFAULT_PASSWORD = "cant_crack_this"
DEFAULT_EMAIL = "testuser@test.com"
DEFAULT_FIRST_NAME = "Test"
DEFAULT_LAST_NAME = "User"

DEFAULT_AP_POINT = {
    "type": "Point",
    "coordinates": [-121.777777777777, 38.98777777777777],
}
DEFAULT_AP_POINT = json.dumps(DEFAULT_AP_POINT)

DEFAULT_CPE_POINT = {
    "type": "Point",
    "coordinates": [
        -121.811111111111111,
        38.92222222222222,
    ],
}
DEFAULT_CPE_POINT = json.dumps(DEFAULT_CPE_POINT)

DEFAULT_TEST_LINESTRING = {
    "type": "LineString",
    "coordinates": [
        [-121.777777777777, 38.98777777777777],
        [-121.811111111111111, 38.92222222222222],
    ],
}
DEFAULT_TEST_LINESTRING = json.dumps(DEFAULT_TEST_LINESTRING)

DEFAULT_TEST_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [-117.70889282226562, 34.45788034775209],
            [-118.09478759765625, 34.033314554166736],
            [-117.34085083007811, 34.09474769880026],
            [-117.70889282226562, 34.45788034775209],
        ]
    ],
}
DEFAULT_TEST_POLYGON = json.dumps(DEFAULT_TEST_POLYGON)

DEFAULT_TEST_MULTIPOLYGON = {
    "type": "MultiPolygon",
    "coordinates": [
        [[[102.0, 2.0], [103.0, 2.0], [103.0, 3.0], [102.0, 3.0], [102.0, 2.0]]],
        [
            [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
            [[100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2]],
        ],
    ],
}
DEFAULT_TEST_MULTIPOLYGON = json.dumps(DEFAULT_TEST_MULTIPOLYGON)

# I cheated for this and found it out ahead of time. Verfied that this looks
# right via geojson.io though.
DEFAULT_TEST_SECTOR = {
    "type": "Polygon",
    "coordinates": [
        [
            [-121.777777777777, 38.98777777777777],
            [-121.9201900978454, 39.051543009893166],
            [-121.91083655756248, 39.06276449015305],
            [-121.90002057499062, 39.07316435862368],
            [-121.88786043534846, 39.08262828549246],
            [-121.87448936290578, 39.091052186159075],
            [-121.86005406181916, 39.09834337898979],
            [-121.84471309989291, 39.104421617800824],
            [-121.82863515334633, 39.10921998700352],
            [-121.81199713259558, 39.112685648895635],
            [-121.7949822107335, 39.11478043428133],
            [-121.777777777777, 39.11548126942665],
            [-121.76057334482053, 39.11478043428133],
            [-121.74355842295844, 39.112685648895635],
            [-121.7269204022077, 39.10921998700352],
            [-121.71084245566111, 39.104421617800824],
            [-121.69550149373487, 39.09834337898979],
            [-121.68106619264823, 39.091052186159075],
            [-121.66769512020556, 39.08262828549246],
            [-121.65553498056339, 39.07316435862368],
            [-121.64471899799155, 39.06276449015305],
            [-121.63536545770862, 39.051543009893166],
            [-121.777777777777, 38.98777777777777],
        ]
    ],
}
DEFAULT_TEST_SECTOR = json.dumps(DEFAULT_TEST_SECTOR)


DEFAULT_TEST_GEO_COLLECTION = {
    "type": "GeometryCollection",
    "geometries": [
        {
            "type": "Polygon",
            "coordinates": [
                [
                    [-74.45676, 40.36817],
                    [-74.45676, 40.36718074074074],
                    [-74.45577074074075, 40.36718074074074],
                    [-74.45577074074075, 40.36817],
                    [-74.45676, 40.36817],
                ]
            ],
        },
        {
            "type": "Polygon",
            "coordinates": [
                [
                    [-74.45577074074075, 40.35926666666666],
                    [-74.45577074074075, 40.35827740740741],
                    [-74.45379222222222, 40.35827740740741],
                    [-74.45379222222222, 40.35926666666666],
                    [-74.45577074074075, 40.35926666666666],
                ]
            ],
        },
        {
            "type": "Polygon",
            "coordinates": [
                [
                    [-74.45478148148149, 40.35629888888889],
                    [-74.45478148148149, 40.35530962962963],
                    [-74.45379222222222, 40.35530962962963],
                    [-74.45379222222222, 40.35629888888889],
                    [-74.45478148148149, 40.35629888888889],
                ]
            ],
        },
    ],
}
DEFAULT_TEST_GEO_COLLECTION = json.dumps(DEFAULT_TEST_GEO_COLLECTION)

DEFAULT_NAME = "Test Object"
DEFAULT_HEIGHT = 10.0
DEFAULT_MAX_RADIUS = 14.2
DEFAULT_HEADING = 0.0
DEFAULT_AZIMUTH = 120.0
DEFAULT_NO_CHECK_RADIUS = 0.01
DEFAULT_CPE_HEIGHT = 1.0
DEFAULT_FREQUENCY = 2.4
DEFAULT_UNEDITABLE = False
DEFAULT_AP_SECTOR_UNEDITABLE = True
DEFAULT_AP_CPE_LINK_UNEDITABLE = True
DEFAULT_SECTOR_NAME = "Test Sector"
DEFAULT_COVERAGE_AREA_NAME = "Area"
DEFAULT_COVERAGE_AREA_NAME_MULTIPOLYGON = "Census Block"


################################################################################
#  TEST CASE UPDATED FIELDS
################################################################################

UPDATED_TEST_POINT = {
    "type": "Point",
    "coordinates": [-122.63763427734375, 39.142842478062505],
}
UPDATED_TEST_POINT = json.dumps(UPDATED_TEST_POINT)

UPDATED_TEST_LINESTRING = {
    "type": "LineString",
    "coordinates": [
        [-122.07733154296875, 39.31517545076218],
        [-122.41241455078125, 39.31517545076218],
    ],
}
UPDATED_TEST_LINESTRING = json.dumps(UPDATED_TEST_LINESTRING)

UPDATED_TEST_POLYGON = {
    "type": "Polygon",
    "coordinates": [
        [
            [-117.81600952148438, 34.42503613021332],
            [-117.59902954101562, 34.42503613021332],
            [-117.59902954101562, 34.56312121279482],
            [-117.81600952148438, 34.56312121279482],
            [-117.81600952148438, 34.42503613021332],
        ]
    ],
}
UPDATED_TEST_POLYGON = json.dumps(UPDATED_TEST_POLYGON)

UPDATED_TEST_MULTIPOLYGON = {
    "type": "MultiPolygon",
    "coordinates": [
        [[[102.0, 12.0], [103.0, 12.0], [103.0, 13.0], [102.0, 13.0], [102.0, 12.0]]],
        [
            [[100.0, 10.0], [101.0, 10.0], [101.0, 11.0], [100.0, 11.0], [100.0, 10.0]],
            [[100.2, 10.2], [100.8, 10.2], [100.8, 10.8], [100.2, 10.8], [100.2, 10.2]],
        ],
    ],
}
UPDATED_TEST_MULTIPOLYGON = json.dumps(UPDATED_TEST_MULTIPOLYGON)

# I cheated for this and found it out ahead of time. Verfied that this looks
# right via geojson.io though.
UPDATED_TEST_SECTOR = {
    "type": "Polygon",
    "coordinates": [
        [
            [-121.777777777777004, 38.987777777777772],
            [-121.780218853567021, 39.009458488264812],
            [-121.777319514548225, 39.009538416369153],
            [-121.774425096916715, 39.00938479542571],
            [-121.771566684211422, 39.008999275197837],
            [-121.768774972253908, 39.0083859958104],
            [-121.76607993864863, 39.007551543168397],
            [-121.763510520098933, 39.006504878045071],
            [-121.761094301046228, 39.005257239611169],
            [-121.758857217010842, 39.003822024454259],
            [-121.75682327584741, 39.002214642403239],
            [-121.755014299925762, 39.000452350723549],
            [-121.753449692013447, 38.998554068482306],
            [-121.752146227370517, 38.996540173095326],
            [-121.751117874275678, 38.994432281258938],
            [-121.750375644886972, 38.992253016635509],
            [-121.749927478006001, 38.990025766801601],
            [-121.749778154963977, 38.98777443207991],
            [-121.749929249486385, 38.985523168959922],
            [-121.75037911202439, 38.983296130866442],
            [-121.75112288866886, 38.9811172090592],
            [-121.752152574392142, 38.97900977644143],
            [-121.753457099996652, 38.976996437019928],
            [-121.755022451792158, 38.975098783694463],
            [-121.756831822678677, 38.973337166961798],
            [-121.758865792983244, 38.971730476999831],
            [-121.76110253908864, 38.970295941450985],
            [-121.763518067604394, 38.969048941055405],
            [-121.766086472566741, 38.968002845091178],
            [-121.76878021291806, 38.967168868367715],
            [-121.77157040730917, 38.966555951287859],
            [-121.774427143090975, 38.966170664249034],
            [-121.777319796218066, 38.966017137395063],
            [-121.780217358676296, 38.966097016462051],
            [-121.777777777777004, 38.987777777777772],
        ]
    ],
}

UPDATED_TEST_GEO_COLLECTION = {
    "type": "GeometryCollection",
    "geometries": [
        {
            "type": "Polygon",
            "coordinates": [
                [
                    [-74.43994259259259, 40.346406296296294],
                    [-74.43994259259259, 40.34541703703704],
                    [-74.43895333333333, 40.34541703703704],
                    [-74.43895333333333, 40.346406296296294],
                    [-74.43994259259259, 40.346406296296294],
                ]
            ],
        }
    ],
}
UPDATED_TEST_GEO_COLLECTION = json.dumps(UPDATED_TEST_GEO_COLLECTION)

UPDATED_NAME = "Test Object Two: Electric Boogaloo"
UPDATED_HEIGHT = 100
UPDATED_MAX_RADIUS = 2.42
UPDATED_HEADING = 90.0
UPDATED_AZIMUTH = 190.0
UPDATED_FREQUENCY = 5
UPDATED_COVERAGE_AREA_NAME = "tribal"


################################################################################
#  URLs FOR REST ENDPOINTS
################################################################################

AP_ENDPOINT = "/pro/workspace/api/ap-los"
SECTOR_ENDPOINT = "/pro/workspace/api/ap-sector"
CPE_ENDPOINT = "/pro/workspace/api/cpe"
AP_CPE_LINK_ENDPOINT = "/pro/workspace/api/ap-cpe-link"
COVERAGE_AREA_ENDPOINT = "/pro/workspace/api/coverage-area"
AP_COVERAGE_AREA_ENDPOINT = "/pro/workspace/api/ap-coverage-area"


################################################################################
#  TEST CASE CLASSES START HERE
################################################################################


class WorkspaceBaseTestCase(TestCase):
    maxDiff = None

    def setUp(self):
        """Set-up test user and test objects."""
        self.testuser = get_user_model().objects.create_superuser(
            username=DEFAULT_USERNAME,
            password=DEFAULT_PASSWORD,
            email=DEFAULT_EMAIL,
            first_name=DEFAULT_FIRST_NAME,
            last_name=DEFAULT_LAST_NAME,
            uneditable=DEFAULT_UNEDITABLE,
        )
        self.testuser.save()

        self.test_session = WorkspaceMapSession(
            owner=self.testuser,
        )
        self.test_session.save()

        self.test_ap = AccessPointLocation(
            owner=self.testuser,
            name=DEFAULT_NAME,
            map_session=self.test_session,
            geojson=DEFAULT_AP_POINT,
            height=DEFAULT_HEIGHT,
            max_radius=DEFAULT_MAX_RADIUS,
            uneditable=DEFAULT_UNEDITABLE,
        )
        self.test_ap.save()

        self.test_sector = AccessPointSector(
            owner=self.testuser,
            name=DEFAULT_SECTOR_NAME,
            map_session=self.test_session,
            ap=self.test_ap,
            height=DEFAULT_HEIGHT,
            heading=DEFAULT_HEADING,
            azimuth=DEFAULT_AZIMUTH,
            default_cpe_height=DEFAULT_CPE_HEIGHT,
            radius=DEFAULT_MAX_RADIUS,
            frequency=DEFAULT_FREQUENCY,
        )
        self.test_sector.save()

        self.test_cpe = CPELocation(
            owner=self.testuser,
            name=DEFAULT_NAME,
            map_session=self.test_session,
            geojson=DEFAULT_CPE_POINT,
            height=DEFAULT_HEIGHT,
            uneditable=DEFAULT_UNEDITABLE,
            sector=self.test_sector,
        )
        self.test_cpe.save()
        # Post Save will modify CPE height to be relative to terrain
        self.test_cpe.height = DEFAULT_HEIGHT
        self.test_cpe.save(update_fields=["height"])

        self.test_cpe_deprecated = CPELocation(
            owner=self.testuser,
            name=DEFAULT_NAME,
            map_session=self.test_session,
            geojson=DEFAULT_CPE_POINT,
            height=DEFAULT_HEIGHT,
            uneditable=DEFAULT_UNEDITABLE,
            ap=self.test_ap,
        )
        self.test_cpe_deprecated.save()
        # Post Save will modify CPE height to be relative to terrain
        self.test_cpe_deprecated.height = DEFAULT_HEIGHT
        self.test_cpe_deprecated.save(update_fields=["height"])

        self.test_ap_cpe_link_deprecated = APToCPELink(
            owner=self.testuser,
            frequency=DEFAULT_FREQUENCY,
            map_session=self.test_session,
            ap=self.test_ap,
            cpe=self.test_cpe_deprecated,
            uneditable=DEFAULT_AP_CPE_LINK_UNEDITABLE,
        )
        self.test_ap_cpe_link_deprecated.save()

        self.test_ap_cpe_link = APToCPELink(
            owner=self.testuser,
            frequency=DEFAULT_FREQUENCY,
            map_session=self.test_session,
            sector=self.test_sector,
            cpe=self.test_cpe,
            uneditable=DEFAULT_AP_CPE_LINK_UNEDITABLE,
        )
        self.test_ap_cpe_link.save()

        self.test_polygon_coverage_area = CoverageArea(
            owner=self.testuser,
            name=DEFAULT_COVERAGE_AREA_NAME,
            map_session=self.test_session,
            geojson=DEFAULT_TEST_POLYGON,
            uneditable=DEFAULT_UNEDITABLE,
        )
        self.test_polygon_coverage_area.save()

        self.test_multipolygon_coverage_area = CoverageArea(
            owner=self.testuser,
            name=DEFAULT_COVERAGE_AREA_NAME_MULTIPOLYGON,
            map_session=self.test_session,
            geojson=DEFAULT_TEST_MULTIPOLYGON,
            uneditable=DEFAULT_UNEDITABLE,
        )
        self.test_multipolygon_coverage_area.save()

    def build_feature_collection(self, features):
        feature_collection = {"type": "FeatureCollection", "features": features}
        self.normalize_json_strings_from_feature_collection(feature_collection)
        return feature_collection

    def trim_mtime_from_feature_collection(self, feature_collection):
        for feature in feature_collection["features"]:
            if "properties" in feature and "last_updated" in feature["properties"]:
                del feature["properties"]["last_updated"]

    def normalize_json_strings_from_feature_collection(self, feature_collection):
        """
        Normalize JSON strings so that different strings that say the same thing
        don't trip up unit tests
        """
        for feature in feature_collection["features"]:
            if "properties" in feature:
                for prop in feature["properties"]:
                    if "_json" in prop:
                        feature["properties"][prop] = (
                            json.dumps(json.loads(feature["properties"][prop]))
                            if feature["properties"][prop]
                            else None
                        )

    def json_dumps(self, data):
        """
        Parses UUID properly
        """
        return json.dumps(
            data, default=lambda x: str(x) if isinstance(x, UUID) else None
        )


class WorkspaceModelsTestCase(WorkspaceBaseTestCase):
    def get_feature_collection_flow(self, serializer, expected_features):
        feature_collection = serializer.get_features_for_session(self.test_session)
        self.trim_mtime_from_feature_collection(feature_collection)
        self.normalize_json_strings_from_feature_collection(feature_collection)
        self.assertJSONEqual(
            json.dumps(self.build_feature_collection(expected_features)),
            self.json_dumps(feature_collection),
        )

    def test_feature_types(self):
        self.assertTrue(self.test_ap.feature_type, FeatureType.AP.value)
        self.assertTrue(self.test_cpe.feature_type, FeatureType.CPE.value)
        self.assertTrue(
            self.test_ap_cpe_link.feature_type, FeatureType.AP_CPE_LINK.value
        )
        self.assertTrue(
            self.test_polygon_coverage_area.feature_type,
            FeatureType.COVERAGE_AREA.value,
        )
        self.assertTrue(
            self.test_multipolygon_coverage_area.feature_type,
            FeatureType.COVERAGE_AREA.value,
        )
        self.assertTrue(self.test_sector, FeatureType.AP_SECTOR.value)

    def test_get_features_for_session_ap(self):
        expected_height_ft = DEFAULT_HEIGHT * 3.28084
        expected_default_cpe_height_ft = DEFAULT_CPE_HEIGHT * 3.28084
        expected_max_radius_miles = DEFAULT_MAX_RADIUS * 0.621371
        coords = json.loads(DEFAULT_AP_POINT)["coordinates"]
        expected_aps = [
            {
                "type": "Feature",
                "geometry": json.loads(DEFAULT_AP_POINT),
                "properties": {
                    "coordinates": f"{coords[1]}, {coords[0]}",
                    "name": DEFAULT_NAME,
                    "height": DEFAULT_HEIGHT,
                    "uuid": str(self.test_ap.uuid),
                    "map_session": str(self.test_session.uuid),
                    "no_check_radius": DEFAULT_NO_CHECK_RADIUS,
                    "default_cpe_height": DEFAULT_CPE_HEIGHT,
                    "feature_type": FeatureType.AP.value,
                    "max_radius": DEFAULT_MAX_RADIUS,
                    "height_ft": expected_height_ft,
                    "lat": coords[1],
                    "lng": coords[0],
                    "cloudrf_coverage_geojson_json": None,
                    "default_cpe_height_ft": expected_default_cpe_height_ft,
                    "radius_miles": expected_max_radius_miles,
                    "uneditable": DEFAULT_UNEDITABLE,
                },
            }
        ]
        self.get_feature_collection_flow(AccessPointSerializer, expected_aps)

    def test_get_features_for_session_cpe(self):
        expected_cpe_deprecated = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_CPE_POINT),
            "properties": {
                "name": DEFAULT_NAME,
                "height": DEFAULT_HEIGHT,
                "height_ft": DEFAULT_HEIGHT * M_2_FT,
                "uuid": str(self.test_cpe_deprecated.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.CPE.value,
                "uneditable": DEFAULT_UNEDITABLE,
                "ap": str(self.test_ap.uuid),
                "sector": None,
            },
        }

        expected_cpe = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_CPE_POINT),
            "properties": {
                "name": DEFAULT_NAME,
                "height": DEFAULT_HEIGHT,
                "height_ft": DEFAULT_HEIGHT * M_2_FT,
                "uuid": str(self.test_cpe.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.CPE.value,
                "uneditable": DEFAULT_UNEDITABLE,
                "ap": None,
                "sector": str(self.test_sector.uuid),
            },
        }
        self.get_feature_collection_flow(
            CPESerializer, [expected_cpe_deprecated, expected_cpe]
        )

    def test_get_features_for_session_sector(self):
        expected_height_ft = DEFAULT_HEIGHT * 3.28084
        expected_default_cpe_height_ft = DEFAULT_CPE_HEIGHT * 3.28084
        expected_distance_miles = DEFAULT_MAX_RADIUS * 0.621371
        expected_sector = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_SECTOR),
            "properties": {
                "ap": str(self.test_ap.uuid),
                "frequency": DEFAULT_FREQUENCY,
                "heading": DEFAULT_HEADING,
                "azimuth": DEFAULT_AZIMUTH,
                "name": DEFAULT_SECTOR_NAME,
                "height": DEFAULT_HEIGHT,
                "radius": DEFAULT_MAX_RADIUS,
                "height_ft": expected_height_ft,
                "default_cpe_height": DEFAULT_CPE_HEIGHT,
                "uuid": str(self.test_sector.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_SECTOR.value,
                "default_cpe_height_ft": expected_default_cpe_height_ft,
                "radius_miles": expected_distance_miles,
                "uneditable": DEFAULT_AP_SECTOR_UNEDITABLE,
                "cloudrf_coverage_geojson_json": None,
                "geojson_json": json.dumps(json.loads(DEFAULT_TEST_SECTOR)),
            },
        }
        self.get_feature_collection_flow(AccessPointSectorSerializer, [expected_sector])

    def test_get_features_for_session_ap_cpe_link(self):
        expected_link_deprecated = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_LINESTRING),
            "properties": {
                "frequency": DEFAULT_FREQUENCY,
                "ap": str(self.test_ap.uuid),
                "sector": None,
                "cpe": str(self.test_cpe_deprecated.uuid),
                "uuid": str(self.test_ap_cpe_link_deprecated.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_CPE_LINK.value,
                "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
            },
        }

        expected_link = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_LINESTRING),
            "properties": {
                "frequency": DEFAULT_FREQUENCY,
                "ap": None,
                "sector": str(self.test_sector.uuid),
                "cpe": str(self.test_cpe.uuid),
                "uuid": str(self.test_ap_cpe_link.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_CPE_LINK.value,
                "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
            },
        }

        self.get_feature_collection_flow(
            APToCPELinkSerializer, [expected_link_deprecated, expected_link]
        )

    def test_get_features_for_session_coverage_area(self):
        expected_polygon = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_POLYGON),
            "properties": {
                "name": DEFAULT_COVERAGE_AREA_NAME,
                "uuid": str(self.test_polygon_coverage_area.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.COVERAGE_AREA.value,
                "uneditable": DEFAULT_UNEDITABLE,
            },
        }
        expected_multipolygon = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_MULTIPOLYGON),
            "properties": {
                "name": DEFAULT_COVERAGE_AREA_NAME_MULTIPOLYGON,
                "uuid": str(self.test_multipolygon_coverage_area.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.COVERAGE_AREA.value,
                "uneditable": DEFAULT_UNEDITABLE,
            },
        }
        self.get_feature_collection_flow(
            CoverageAreaSerializer, [expected_multipolygon, expected_polygon]
        )


class WorkspaceRestViewsTestCase(WorkspaceBaseTestCase):
    def setUp(self):
        super(WorkspaceRestViewsTestCase, self).setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.testuser)

    def create_geojson_model(self, model_cls, endpoint, data):
        """Uses the POST endpoint for the model class to create a model, then check if it's in db."""

        response = self.client.post(
            f"{endpoint}/", data, format="json", HTTP_ACCEPT=JSON_CONTENT_TYPE
        )
        self.assertEqual(response.status_code, HTTP_201_CREATED)
        new_id = response.json()["uuid"]
        return model_cls.objects.get(uuid=new_id)

    def create_geojson_model_fail(self, model_cls, endpoint, data, response_code):
        num_user_models = len(model_cls.objects.filter(owner=self.testuser))
        response = self.client.post(
            f"{endpoint}/", data, format="json", HTTP_ACCEPT=JSON_CONTENT_TYPE
        )
        new_num_user_models = len(model_cls.objects.filter(owner=self.testuser))
        self.assertEqual(response.status_code, response_code)
        self.assertEqual(num_user_models, new_num_user_models)

    def update_geojson_model(self, model_cls, endpoint, model_id, data):
        """Uses the PATCH endpoint for the model class to create a model, then retrieve it from db."""
        response = self.client.patch(
            f"{endpoint}/{model_id}/",
            data,
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )
        self.assertEqual(response.status_code, HTTP_200_OK)
        return model_cls.objects.get(uuid=model_id)

    def delete_geojson_model(self, model_cls, endpoint, model_id):
        """Uses the DELETE endpoint for the model class to delete the model, then test if its deleted."""
        num_user_models = len(model_cls.objects.filter(owner=self.testuser))
        response = self.client.delete(
            f"{endpoint}/{model_id}/", HTTP_ACCEPT=JSON_CONTENT_TYPE
        )
        new_num_user_models = len(model_cls.objects.filter(owner=self.testuser))

        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)
        self.assertFalse(model_cls.objects.filter(uuid=model_id).exists())
        self.assertEqual(num_user_models - 1, new_num_user_models)

    def test_create_ap(self):
        new_ap = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_AP_POINT,
            "height": DEFAULT_HEIGHT,
            "max_radius": DEFAULT_MAX_RADIUS,
        }
        ap = self.create_geojson_model(AccessPointLocation, AP_ENDPOINT, new_ap)
        self.assertEqual(ap.owner, self.testuser)
        self.assertEqual(ap.name, DEFAULT_NAME)
        self.assertJSONEqual(ap.geojson.json, DEFAULT_AP_POINT)
        self.assertEqual(ap.height, DEFAULT_HEIGHT)
        self.assertEqual(ap.max_radius, DEFAULT_MAX_RADIUS)
        self.assertEqual(ap.uneditable, DEFAULT_UNEDITABLE)

    def test_create_sector(self):
        new_sector = {
            "name": DEFAULT_NAME,
            "ap": self.test_ap.uuid,
            "height": DEFAULT_HEIGHT,
            "heading": DEFAULT_HEADING,
            "azimuth": DEFAULT_AZIMUTH,
            "frequency": DEFAULT_FREQUENCY,
            "radius": DEFAULT_MAX_RADIUS,
        }
        sector = self.create_geojson_model(
            AccessPointSector, SECTOR_ENDPOINT, new_sector
        )
        self.assertEqual(sector.owner, self.testuser)
        self.assertEqual(sector.name, DEFAULT_NAME)
        self.assertJSONEqual(sector.geojson.json, DEFAULT_TEST_SECTOR)
        self.assertEqual(sector.ap, self.test_ap)
        self.assertEqual(sector.height, DEFAULT_HEIGHT)
        self.assertEqual(sector.radius, DEFAULT_MAX_RADIUS)
        self.assertEqual(sector.heading, DEFAULT_HEADING)
        self.assertEqual(sector.azimuth, DEFAULT_AZIMUTH)
        self.assertEqual(sector.feature_type, FeatureType.AP_SECTOR.value)

    def test_create_cpe(self):
        new_cpe = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_CPE_POINT,
            "height": DEFAULT_HEIGHT,
            "sector": self.test_sector.uuid,
        }
        cpe = self.create_geojson_model(CPELocation, CPE_ENDPOINT, new_cpe)
        self.assertEqual(cpe.owner, self.testuser)
        self.assertEqual(cpe.name, DEFAULT_NAME)
        self.assertJSONEqual(cpe.geojson.json, DEFAULT_CPE_POINT)
        self.assertAlmostEqual(
            cpe.height, cpe.get_dsm_height() - cpe.get_dtm_height() + DEFAULT_HEIGHT, 8
        )
        self.assertEqual(cpe.uneditable, DEFAULT_UNEDITABLE)
        self.assertEqual(cpe.ap, None)
        self.assertEqual(cpe.sector, self.test_sector)

    def test_create_cpe_deprecated(self):
        new_cpe = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_CPE_POINT,
            "height": DEFAULT_HEIGHT,
            "ap": self.test_ap.uuid,
        }
        cpe = self.create_geojson_model(CPELocation, CPE_ENDPOINT, new_cpe)
        self.assertEqual(cpe.owner, self.testuser)
        self.assertEqual(cpe.name, DEFAULT_NAME)
        self.assertJSONEqual(cpe.geojson.json, DEFAULT_CPE_POINT)
        self.assertAlmostEqual(
            cpe.height, cpe.get_dsm_height() - cpe.get_dtm_height() + DEFAULT_HEIGHT, 8
        )
        self.assertEqual(cpe.uneditable, DEFAULT_UNEDITABLE)
        self.assertEqual(cpe.ap, self.test_ap)
        self.assertEqual(cpe.sector, None)

    def test_create_ap_cpe_link(self):
        new_link = {
            "frequency": DEFAULT_FREQUENCY,
            "geojson": DEFAULT_TEST_LINESTRING,
            "sector": self.test_sector.uuid,
            "cpe": self.test_cpe.uuid,
            "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
        }
        link = self.create_geojson_model(APToCPELink, AP_CPE_LINK_ENDPOINT, new_link)
        self.assertEqual(link.owner, self.testuser)
        self.assertEqual(link.frequency, DEFAULT_FREQUENCY)
        self.assertJSONEqual(link.geojson.json, DEFAULT_TEST_LINESTRING)
        self.assertEqual(link.ap, None)
        self.assertEqual(link.sector, self.test_sector)
        self.assertEqual(link.cpe, self.test_cpe)
        self.assertEqual(link.uneditable, DEFAULT_AP_CPE_LINK_UNEDITABLE)

    def test_create_ap_cpe_link_frequency(self):
        new_link = {
            "frequency": UPDATED_FREQUENCY,
            "geojson": DEFAULT_TEST_LINESTRING,
            "sector": self.test_sector.uuid,
            "cpe": self.test_cpe.uuid,
            "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
        }
        link = self.create_geojson_model(APToCPELink, AP_CPE_LINK_ENDPOINT, new_link)
        self.assertEqual(link.owner, self.testuser)
        self.assertEqual(link.frequency, DEFAULT_FREQUENCY)
        self.assertJSONEqual(link.geojson.json, DEFAULT_TEST_LINESTRING)
        self.assertEqual(link.ap, None)
        self.assertEqual(link.sector, self.test_sector)
        self.assertEqual(link.cpe, self.test_cpe)
        self.assertEqual(link.uneditable, DEFAULT_AP_CPE_LINK_UNEDITABLE)

    def test_create_ap_cpe_link_deprecated(self):
        new_link = {
            "frequency": DEFAULT_FREQUENCY,
            "geojson": DEFAULT_TEST_LINESTRING,
            "ap": self.test_ap.uuid,
            "cpe": self.test_cpe_deprecated.uuid,
            "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
        }
        link = self.create_geojson_model(APToCPELink, AP_CPE_LINK_ENDPOINT, new_link)
        self.assertEqual(link.owner, self.testuser)
        self.assertEqual(link.frequency, DEFAULT_FREQUENCY)
        self.assertJSONEqual(link.geojson.json, DEFAULT_TEST_LINESTRING)
        self.assertEqual(link.ap, self.test_ap)
        self.assertEqual(link.sector, None)
        self.assertEqual(link.cpe, self.test_cpe_deprecated)
        self.assertEqual(link.uneditable, DEFAULT_AP_CPE_LINK_UNEDITABLE)

    def test_create_polygon_coverage_area(self):
        new_area = {
            "geojson": DEFAULT_TEST_POLYGON,
            "uneditable": DEFAULT_UNEDITABLE,
            "name": DEFAULT_COVERAGE_AREA_NAME,
        }
        area = self.create_geojson_model(CoverageArea, COVERAGE_AREA_ENDPOINT, new_area)
        self.assertEqual(area.owner, self.testuser)
        self.assertEqual(area.uneditable, DEFAULT_UNEDITABLE)
        self.assertEqual(area.name, DEFAULT_COVERAGE_AREA_NAME)
        self.assertJSONEqual(area.geojson.json, DEFAULT_TEST_POLYGON)

    def test_create_multipolygon_coverage_area(self):
        new_area = {
            "geojson": DEFAULT_TEST_MULTIPOLYGON,
            "uneditable": DEFAULT_UNEDITABLE,
            "name": DEFAULT_COVERAGE_AREA_NAME_MULTIPOLYGON,
        }
        area = self.create_geojson_model(CoverageArea, COVERAGE_AREA_ENDPOINT, new_area)
        self.assertEqual(area.owner, self.testuser)
        self.assertEqual(area.uneditable, DEFAULT_UNEDITABLE)
        self.assertEqual(area.name, DEFAULT_COVERAGE_AREA_NAME_MULTIPOLYGON)
        self.assertJSONEqual(area.geojson.json, DEFAULT_TEST_MULTIPOLYGON)

    def test_create_ap_and_sector_bad_request(self):
        new_cpe_both = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_CPE_POINT,
            "height": DEFAULT_HEIGHT,
            "ap": self.test_ap.uuid,
            "sector": self.test_sector.uuid,
        }

        new_cpe_none = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_CPE_POINT,
            "height": DEFAULT_HEIGHT,
        }

        new_link_both = {
            "frequency": DEFAULT_FREQUENCY,
            "geojson": DEFAULT_TEST_LINESTRING,
            "ap": self.test_ap.uuid,
            "sector": self.test_sector.uuid,
            "cpe": self.test_cpe_deprecated.uuid,
            "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
        }

        new_link_none = {
            "frequency": DEFAULT_FREQUENCY,
            "geojson": DEFAULT_TEST_LINESTRING,
            "cpe": self.test_cpe_deprecated.uuid,
            "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
        }

        self.create_geojson_model_fail(
            CPELocation, CPE_ENDPOINT, new_cpe_both, HTTP_400_BAD_REQUEST
        )
        self.create_geojson_model_fail(
            CPELocation, CPE_ENDPOINT, new_cpe_none, HTTP_400_BAD_REQUEST
        )
        self.create_geojson_model_fail(
            APToCPELink, AP_CPE_LINK_ENDPOINT, new_link_both, HTTP_400_BAD_REQUEST
        )
        self.create_geojson_model_fail(
            APToCPELink, AP_CPE_LINK_ENDPOINT, new_link_none, HTTP_400_BAD_REQUEST
        )

    def test_update_ap(self):
        ap_id = self.test_ap.uuid
        updated_ap = {
            "name": UPDATED_NAME,
            "geojson": UPDATED_TEST_POINT,
            "height": UPDATED_HEIGHT,
            "max_radius": UPDATED_MAX_RADIUS,
        }
        ap = self.update_geojson_model(
            AccessPointLocation, AP_ENDPOINT, ap_id, updated_ap
        )
        self.assertEqual(ap.owner, self.testuser)
        self.assertEqual(ap.name, UPDATED_NAME)
        self.assertJSONEqual(ap.geojson.json, UPDATED_TEST_POINT)
        self.assertEqual(ap.height, UPDATED_HEIGHT)
        self.assertEqual(ap.max_radius, UPDATED_MAX_RADIUS)

    def test_update_sector(self):
        sector_id = self.test_sector.uuid
        updated_sector = {
            "name": UPDATED_NAME,
            "height": UPDATED_HEIGHT,
            "radius": UPDATED_MAX_RADIUS,
            "heading": UPDATED_HEADING,
            "azimuth": UPDATED_AZIMUTH,
            "frequency": UPDATED_FREQUENCY,
        }
        sector = self.update_geojson_model(
            AccessPointSector, SECTOR_ENDPOINT, sector_id, updated_sector
        )

        self.test_ap_cpe_link.refresh_from_db()

        self.assertJSONEqual(sector.geojson.json, UPDATED_TEST_SECTOR)
        self.assertEqual(sector.owner, self.testuser)
        self.assertEqual(sector.name, UPDATED_NAME)
        self.assertEqual(sector.height, UPDATED_HEIGHT)
        self.assertEqual(sector.radius, UPDATED_MAX_RADIUS)
        self.assertEqual(sector.heading, UPDATED_HEADING)
        self.assertEqual(sector.azimuth, UPDATED_AZIMUTH)
        self.assertEqual(sector.frequency, UPDATED_FREQUENCY)
        self.assertEqual(self.test_ap_cpe_link.frequency, UPDATED_FREQUENCY)

    def test_update_items_not_exist(self):
        id = str(uuid4())
        data = {
            "name": UPDATED_NAME,
            "geojson": UPDATED_TEST_POINT,
            "height": UPDATED_HEIGHT,
            "max_radius": UPDATED_MAX_RADIUS,
        }

        for endpoint in [
            AP_ENDPOINT,
            AP_CPE_LINK_ENDPOINT,
            AP_COVERAGE_AREA_ENDPOINT,
            CPE_ENDPOINT,
        ]:
            response = self.client.patch(
                f"{endpoint}/{id}/",
                data,
                format="json",
                HTTP_ACCEPT=JSON_CONTENT_TYPE,
            )

            self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)

    def test_update_cpe(self):
        cpe_id = self.test_cpe.uuid
        updated_cpe = {
            "name": UPDATED_NAME,
            "geojson": UPDATED_TEST_POINT,
            "height": UPDATED_HEIGHT,
        }
        cpe = self.update_geojson_model(CPELocation, CPE_ENDPOINT, cpe_id, updated_cpe)
        self.assertEqual(cpe.owner, self.testuser)
        self.assertEqual(cpe.name, UPDATED_NAME)
        self.assertJSONEqual(cpe.geojson.json, UPDATED_TEST_POINT)
        self.assertEqual(cpe.height, UPDATED_HEIGHT)

    def test_update_ap_cpe_link_deprecated(self):
        link_id = self.test_ap_cpe_link_deprecated.uuid
        updated_link = {
            "frequency": UPDATED_FREQUENCY,
        }
        link = self.update_geojson_model(
            APToCPELink, AP_CPE_LINK_ENDPOINT, link_id, updated_link
        )
        self.assertEqual(link.owner, self.testuser)
        self.assertEqual(link.frequency, UPDATED_FREQUENCY)
        self.assertEqual(link.ap, self.test_ap)
        self.assertEqual(link.sector, None)
        self.assertEqual(link.cpe, self.test_cpe_deprecated)

    def test_update_polygon_coverage_area(self):
        area_id = self.test_polygon_coverage_area.uuid
        updated_area = {
            "geojson": UPDATED_TEST_POLYGON,
            "name": UPDATED_COVERAGE_AREA_NAME,
        }
        area = self.update_geojson_model(
            CoverageArea, COVERAGE_AREA_ENDPOINT, area_id, updated_area
        )
        self.assertEqual(area.owner, self.testuser)
        self.assertEqual(area.name, UPDATED_COVERAGE_AREA_NAME)
        self.assertJSONEqual(area.geojson.json, UPDATED_TEST_POLYGON)

    def test_update_multipolygon_coverage_area(self):
        area_id = self.test_multipolygon_coverage_area.uuid
        updated_area = {"geojson": UPDATED_TEST_MULTIPOLYGON}
        area = self.update_geojson_model(
            CoverageArea, COVERAGE_AREA_ENDPOINT, area_id, updated_area
        )
        self.assertEqual(area.owner, self.testuser)
        self.assertJSONEqual(area.geojson.json, UPDATED_TEST_MULTIPOLYGON)

    def test_delete_geojson_models(self):
        # have to delete the AP CPE link first
        self.delete_geojson_model(
            APToCPELink, AP_CPE_LINK_ENDPOINT, self.test_ap_cpe_link.uuid
        )
        self.delete_geojson_model(CPELocation, CPE_ENDPOINT, self.test_cpe.uuid)
        self.delete_geojson_model(
            AccessPointSector, SECTOR_ENDPOINT, self.test_sector.uuid
        )
        self.delete_geojson_model(AccessPointLocation, AP_ENDPOINT, self.test_ap.uuid)
        self.delete_geojson_model(
            CoverageArea, COVERAGE_AREA_ENDPOINT, self.test_polygon_coverage_area.uuid
        )
        self.delete_geojson_model(
            CoverageArea,
            COVERAGE_AREA_ENDPOINT,
            self.test_multipolygon_coverage_area.uuid,
        )

    def test_delete_ap_fk(self):
        self.delete_geojson_model(AccessPointLocation, AP_ENDPOINT, self.test_ap.uuid)
        self.assertFalse(CPELocation.objects.filter(uuid=self.test_cpe.uuid).exists())
        self.assertFalse(
            AccessPointSector.objects.filter(uuid=self.test_sector.uuid).exists()
        )


class WorkspaceGeojsonUtilsTestCase(WorkspaceBaseTestCase):
    def test_merge_two_feature_collections(self):
        expected_link_deprecated = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_LINESTRING),
            "properties": {
                "frequency": DEFAULT_FREQUENCY,
                "ap": str(self.test_ap.uuid),
                "sector": None,
                "cpe": str(self.test_cpe_deprecated.uuid),
                "uuid": str(self.test_ap_cpe_link_deprecated.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_CPE_LINK.value,
                "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
            },
        }

        expected_link = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_LINESTRING),
            "properties": {
                "frequency": DEFAULT_FREQUENCY,
                "ap": None,
                "sector": str(self.test_sector.uuid),
                "cpe": str(self.test_cpe.uuid),
                "uuid": str(self.test_ap_cpe_link.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_CPE_LINK.value,
                "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
            },
        }

        expected_cpe_deprecated = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_CPE_POINT),
            "properties": {
                "name": DEFAULT_NAME,
                "height": DEFAULT_HEIGHT,
                "height_ft": DEFAULT_HEIGHT * M_2_FT,
                "uuid": str(self.test_cpe_deprecated.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.CPE.value,
                "uneditable": DEFAULT_UNEDITABLE,
                "ap": str(self.test_ap.uuid),
                "sector": None,
            },
        }

        expected_cpe = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_CPE_POINT),
            "properties": {
                "name": DEFAULT_NAME,
                "height": DEFAULT_HEIGHT,
                "height_ft": DEFAULT_HEIGHT * M_2_FT,
                "map_session": str(self.test_session.uuid),
                "uuid": str(self.test_cpe.uuid),
                "feature_type": FeatureType.CPE.value,
                "uneditable": DEFAULT_UNEDITABLE,
                "ap": None,
                "sector": str(self.test_sector.uuid),
            },
        }
        expected_feature_collection = self.build_feature_collection(
            [
                expected_link_deprecated,
                expected_link,
                expected_cpe_deprecated,
                expected_cpe,
            ]
        )

        links = APToCPELinkSerializer.get_features_for_session(self.test_session)
        cpes = CPESerializer.get_features_for_session(self.test_session)
        feature_collection = geojson_utils.merge_feature_collections(links, cpes)
        self.trim_mtime_from_feature_collection(feature_collection)
        self.assertJSONEqual(
            json.dumps(expected_feature_collection), self.json_dumps(feature_collection)
        )

    def test_merge_two_feature_collections_one_empty(self):
        expected_link_deprecated = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_LINESTRING),
            "properties": {
                "frequency": DEFAULT_FREQUENCY,
                "ap": str(self.test_ap.uuid),
                "sector": None,
                "cpe": str(self.test_cpe_deprecated.uuid),
                "uuid": str(self.test_ap_cpe_link_deprecated.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_CPE_LINK.value,
                "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
            },
        }

        expected_link = {
            "type": "Feature",
            "geometry": json.loads(DEFAULT_TEST_LINESTRING),
            "properties": {
                "frequency": DEFAULT_FREQUENCY,
                "ap": None,
                "sector": str(self.test_sector.uuid),
                "cpe": str(self.test_cpe.uuid),
                "uuid": str(self.test_ap_cpe_link.uuid),
                "map_session": str(self.test_session.uuid),
                "feature_type": FeatureType.AP_CPE_LINK.value,
                "uneditable": DEFAULT_AP_CPE_LINK_UNEDITABLE,
            },
        }

        expected_feature_collection = self.build_feature_collection(
            [expected_link_deprecated, expected_link]
        )

        links = APToCPELinkSerializer.get_features_for_session(self.test_session)
        empty_feature_collection = {"type": "FeatureCollection", "features": []}
        feature_collection = geojson_utils.merge_feature_collections(
            links, empty_feature_collection
        )
        self.trim_mtime_from_feature_collection(feature_collection)
        self.assertJSONEqual(
            json.dumps(expected_feature_collection), self.json_dumps(feature_collection)
        )


class WorkspacePTPLinkTestCase(WorkspaceRestViewsTestCase):
    def test_long_linestring_validation(self):
        ptp = PointToPointLink(
            owner=self.testuser,
            map_session=self.test_session,
            geojson=LineString((0, 0), (1, 1), (2, 3)),
        )
        self.assertRaises(ValidationError, ptp.full_clean)


# TODO: Remove the AP cloudrf TCs once we launch Workspace and AP Sectors
class WorkspaceCloudRfCoverageTestCase(WorkspaceRestViewsTestCase):
    def setUp(self):
        super(WorkspaceCloudRfCoverageTestCase, self).setUp()
        self.test_ap_with_cloudrf = AccessPointLocation(
            owner=self.testuser,
            name=DEFAULT_NAME,
            map_session=self.test_session,
            geojson=DEFAULT_AP_POINT,
            height=DEFAULT_HEIGHT,
            max_radius=DEFAULT_MAX_RADIUS,
            uneditable=DEFAULT_UNEDITABLE,
            cloudrf_coverage_geojson=DEFAULT_TEST_GEO_COLLECTION,
        )
        self.test_ap_with_cloudrf.save()

        self.test_sector_with_cloudrf = AccessPointSector(
            owner=self.testuser,
            name=DEFAULT_SECTOR_NAME,
            map_session=self.test_session,
            ap=self.test_ap_with_cloudrf,
            height=DEFAULT_HEIGHT,
            heading=DEFAULT_HEADING,
            azimuth=DEFAULT_AZIMUTH,
            default_cpe_height=DEFAULT_CPE_HEIGHT,
            radius=DEFAULT_MAX_RADIUS,
            frequency=DEFAULT_FREQUENCY,
            cloudrf_coverage_geojson=DEFAULT_TEST_MULTIPOLYGON,
        )
        self.test_sector_with_cloudrf.save()

        self.test_sector_with_cloudrf.cloudrf_task.hash = (
            self.test_sector_with_cloudrf.cloudrf_task.calculate_hash()
        )
        self.test_sector_with_cloudrf.cloudrf_task.save()

    def update_ap_test_delete_cloudrf_flow(self, updated_ap={}):
        ap_id = self.test_ap_with_cloudrf.uuid
        new_ap = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_AP_POINT,
            "height": DEFAULT_HEIGHT,
            "max_radius": DEFAULT_MAX_RADIUS,
            "uneditable": DEFAULT_UNEDITABLE,
        }
        new_ap.update(updated_ap)
        ap = self.update_geojson_model(AccessPointLocation, AP_ENDPOINT, ap_id, new_ap)
        self.assertEqual(ap.cloudrf_coverage_geojson, None)

    def update_ap_test_no_delete_cloudrf_flow(
        self, updated_ap, expected_cloudrf=DEFAULT_TEST_GEO_COLLECTION
    ):
        ap_id = self.test_ap_with_cloudrf.uuid
        new_ap = {
            "name": DEFAULT_NAME,
            "geojson": DEFAULT_AP_POINT,
            "height": DEFAULT_HEIGHT,
            "max_radius": DEFAULT_MAX_RADIUS,
            "uneditable": DEFAULT_UNEDITABLE,
        }
        new_ap.update(updated_ap)
        ap = self.update_geojson_model(AccessPointLocation, AP_ENDPOINT, ap_id, new_ap)
        self.assertJSONEqual(expected_cloudrf, ap.cloudrf_coverage_geojson_json)

    def update_sector_test_delete_cloudrf_flow(self, updated_sector={}):
        sector_id = self.test_sector_with_cloudrf.uuid
        new_sector = {
            "name": DEFAULT_NAME,
            "height": DEFAULT_HEIGHT,
            "heading": DEFAULT_HEADING,
            "azimuth": DEFAULT_AZIMUTH,
            "frequency": DEFAULT_FREQUENCY,
            "radius": DEFAULT_MAX_RADIUS,
            "uneditable": DEFAULT_UNEDITABLE,
        }
        new_sector.update(updated_sector)
        sector = self.update_geojson_model(
            AccessPointSector, SECTOR_ENDPOINT, sector_id, new_sector
        )
        self.assertEqual(sector.cloudrf_coverage_geojson, None)

    def update_sector_test_no_delete_cloudrf_flow(
        self, updated_sector={}, expected_cloudrf=DEFAULT_TEST_MULTIPOLYGON
    ):
        sector_id = self.test_sector_with_cloudrf.uuid
        new_sector = {
            "name": DEFAULT_NAME,
            "height": DEFAULT_HEIGHT,
            "heading": DEFAULT_HEADING,
            "azimuth": DEFAULT_AZIMUTH,
            "frequency": DEFAULT_FREQUENCY,
            "radius": DEFAULT_MAX_RADIUS,
            "uneditable": DEFAULT_UNEDITABLE,
        }
        new_sector.update(updated_sector)
        sector = self.update_geojson_model(
            AccessPointSector, SECTOR_ENDPOINT, sector_id, new_sector
        )
        self.assertJSONEqual(expected_cloudrf, sector.cloudrf_coverage_geojson_json)

    def test_update_ap_location_delete_cloudrf(self):
        updated_ap = {"geojson": UPDATED_TEST_POINT}
        self.update_ap_test_delete_cloudrf_flow(updated_ap)

        # Test that the cloudRF coverage for the associated sector is gone
        self.update_sector_test_delete_cloudrf_flow()

    def test_update_ap_height_delete_cloudrf(self):
        updated_ap = {"height": UPDATED_HEIGHT}
        self.update_ap_test_delete_cloudrf_flow(updated_ap)

    def test_update_ap_default_cpe_height_delete_cloudrf(self):
        updated_ap = {"default_cpe_height": UPDATED_HEIGHT}
        self.update_ap_test_delete_cloudrf_flow(updated_ap)

    def test_update_ap_max_radius_delete_cloudrf(self):
        updated_ap = {"max_radius": UPDATED_MAX_RADIUS}
        self.update_ap_test_delete_cloudrf_flow(updated_ap)

    def test_update_ap_name_no_delete_cloudrf(self):
        updated_ap = {"name": UPDATED_NAME}
        self.update_ap_test_no_delete_cloudrf_flow(updated_ap)

    def test_update_ap_height_epsilon_no_delete_cloudrf(self):
        updated_ap = {"height": DEFAULT_HEIGHT + 1e-10}
        self.update_ap_test_no_delete_cloudrf_flow(updated_ap)

    def test_update_ap_uneditable_cloudrf_coverage(self):
        updated_ap = {"uneditable": not DEFAULT_UNEDITABLE}
        self.update_ap_test_no_delete_cloudrf_flow(updated_ap)

    def test_update_sector_height_delete_cloudrf(self):
        updated_sector = {"height": UPDATED_HEIGHT}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_heading_delete_cloudrf(self):
        updated_sector = {"heading": UPDATED_HEADING}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_azimuth_delete_cloudrf(self):
        updated_sector = {"azimuth": UPDATED_AZIMUTH}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_default_cpe_height_delete_cloudrf(self):
        updated_sector = {"default_cpe_height": UPDATED_HEIGHT}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_radius_delete_cloudrf(self):
        updated_sector = {"radius": UPDATED_MAX_RADIUS}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_name_no_delete_cloudrf(self):
        updated_sector = {"name": UPDATED_NAME}
        self.update_sector_test_no_delete_cloudrf_flow(updated_sector)

    def test_update_sector_frequency_no_delete_cloudrf(self):
        updated_sector = {"frequency": UPDATED_FREQUENCY}
        self.update_sector_test_no_delete_cloudrf_flow(updated_sector)

    def test_update_sector_height_epsilon_no_delete_cloudrf(self):
        updated_sector = {"height": DEFAULT_HEIGHT + 1e-10}
        self.update_sector_test_no_delete_cloudrf_flow(updated_sector)

    def test_update_ap_cloudrf_coverage(self):
        updated_ap = {"cloudrf_coverage_geojson": UPDATED_TEST_GEO_COLLECTION}
        self.update_ap_test_no_delete_cloudrf_flow(
            updated_ap, UPDATED_TEST_GEO_COLLECTION
        )

    def test_update_sector_height_ft_delete_cloudrf(self):
        updated_sector = {"height_ft": UPDATED_HEIGHT}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_default_cpe_height_ft_delete_cloudrf(self):
        updated_sector = {"default_cpe_height_ft": UPDATED_HEIGHT}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_radius_miles_delete_cloudrf(self):
        updated_sector = {"radius_miles": UPDATED_MAX_RADIUS}
        self.update_sector_test_delete_cloudrf_flow(updated_sector)

    def test_update_sector_uneditable_cloudrf_coverage(self):
        updated_sector = {"uneditable": not self.test_sector_with_cloudrf.uneditable}
        self.update_sector_test_no_delete_cloudrf_flow(updated_sector)

    def test_save_cloudrf_coverage(self):
        ap = AccessPointLocation.objects.get(uuid=self.test_ap.uuid)
        ap.cloudrf_coverage_geojson = DEFAULT_TEST_GEO_COLLECTION
        ap.save()

        self.assertJSONEqual(
            DEFAULT_TEST_GEO_COLLECTION, ap.cloudrf_coverage_geojson_json
        )

        sector = AccessPointSector.objects.get(uuid=self.test_sector.uuid)
        sector.cloudrf_coverage_geojson = DEFAULT_TEST_MULTIPOLYGON
        sector.save()
        self.assertJSONEqual(
            DEFAULT_TEST_MULTIPOLYGON, sector.cloudrf_coverage_geojson_json
        )
