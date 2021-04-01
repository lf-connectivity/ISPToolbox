from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.status import HTTP_200_OK, HTTP_201_CREATED, HTTP_204_NO_CONTENT
from rest_framework.test import APIClient
import json

from workspace.constants import FeatureType
from workspace.models import AccessPointLocation, CPELocation, APToCPELink
from workspace.serializers import AccessPointSerializer, CPESerializer, APToCPELinkSerializer

import ptvsd # @nocommit - vscode python debugger
ptvsd.enable_attach(address=('0.0.0.0', 3000))
ptvsd.wait_for_attach()

################################################################################
#  UNIVERSAL CONSTANTS
################################################################################

JSON_CONTENT_TYPE = 'application/json'


################################################################################
#  TEST CASE DEFAULTS
################################################################################

DEFAULT_USERNAME = 'testuser@test.com'
DEFAULT_PASSWORD = 'cant_crack_this'

DEFAULT_TEST_POINT = {
    "type": "Point",
    "coordinates": [
        -121.75872802734375,
        38.923092265981779
    ]
}
DEFAULT_TEST_POINT = json.dumps(DEFAULT_TEST_POINT)

DEFAULT_TEST_LINESTRING = {
    "type": "LineString",
    "coordinates": [
        [
            -121.23687744140624,
            38.929502416386605
        ],
        [
            -121.30828857421875,
            38.45573955865588
        ]
    ]
}
DEFAULT_TEST_LINESTRING = json.dumps(DEFAULT_TEST_LINESTRING)

DEFAULT_NAME = 'Test Object'
DEFAULT_HEIGHT = 10.0
DEFAULT_MAX_RADIUS = 14.2
DEFAULT_NO_CHECK_RADIUS = 0.01
DEFAULT_CPE_HEIGHT = 2.0
DEFAULT_FREQUENCY = 2.4


################################################################################
#  TEST CASE UPDATED FIELDS
################################################################################

UPDATED_TEST_POINT = {
    "type": "Point",
    "coordinates": [
        -122.63763427734375,
        39.142842478062505
    ]
}
UPDATED_TEST_POINT = json.dumps(UPDATED_TEST_POINT)

UPDATED_TEST_LINESTRING = {
    "type": "LineString",
    "coordinates": [
        [
            -122.07733154296875,
            39.31517545076218
        ],
        [
            -122.41241455078125,
            39.31517545076218
        ]
    ]
}
UPDATED_TEST_LINESTRING = json.dumps(UPDATED_TEST_LINESTRING)

UPDATED_NAME = 'Test Object Two: Electric Boogaloo'
UPDATED_HEIGHT = 100
UPDATED_MAX_RADIUS = 2.42
UPDATED_FREQUENCY = 5


################################################################################
#  URLs FOR REST ENDPOINTS
################################################################################

AP_ENDPOINT = '/pro/workspace/api/ap-los'
CPE_ENDPOINT = '/pro/workspace/api/cpe'
AP_CPE_LINK_ENDPOINT = '/pro/workspace/api/ap-cpe-link'


################################################################################
#  TEST CASE CLASSES START HERE
################################################################################

class WorkspaceBaseTestCase(TestCase):
    def setUp(self):
        """Set-up test user and test objects."""
        self.testuser = get_user_model().objects.create_user(
            username=DEFAULT_USERNAME,
            password=DEFAULT_PASSWORD
        )
        self.testuser.save()

        self.test_ap = AccessPointLocation(
            owner=self.testuser,
            name=DEFAULT_NAME,
            geojson=DEFAULT_TEST_POINT,
            height=DEFAULT_HEIGHT,
            max_radius=DEFAULT_MAX_RADIUS
        )
        self.test_ap.save()

        self.test_cpe = CPELocation(
            owner=self.testuser,
            name=DEFAULT_NAME,
            geojson=DEFAULT_TEST_POINT,
            height=DEFAULT_HEIGHT
        )
        self.test_cpe.save()

        self.test_ap_cpe_link = APToCPELink(
            owner=self.testuser,
            geojson=DEFAULT_TEST_LINESTRING,
            ap=self.test_ap,
            cpe=self.test_cpe
        )
        self.test_ap_cpe_link.save()


class WorkspaceModelsTestCase(WorkspaceBaseTestCase):
    def build_expected_feature_collection(self, features):
        return {
            'type': 'FeatureCollection',
            'features': features
        }
    
    def trim_mtime_from_feature_collection(self, feature_collection):
        for feature in feature_collection['features']:
            if 'properties' in feature and 'last_updated' in feature['properties']:
                del feature['properties']['last_updated']

    def get_feature_collection_flow(self, model_cls, serializer, expected_features):
        feature_collection = model_cls.get_features_for_user(self.testuser, serializer)
        self.trim_mtime_from_feature_collection(feature_collection)
        self.assertJSONEqual(json.dumps(self.build_expected_feature_collection(expected_features)),
            json.dumps(feature_collection))


    def test_feature_types(self):
        self.assertTrue(self.test_ap.feature_type, FeatureType.AP.value)
        self.assertTrue(self.test_cpe.feature_type, FeatureType.CPE.value)
        self.assertTrue(self.test_ap_cpe_link.feature_type, FeatureType.AP_CPE_LINK.value)

    def test_get_features_for_user_ap(self):
        expected_height_ft = DEFAULT_HEIGHT * 3.28084
        expected_max_radius_miles = DEFAULT_MAX_RADIUS * 0.621371
        expected_ap = {
            'type': 'Feature',
            'geometry': json.loads(DEFAULT_TEST_POINT),
            'properties': {
                'name': DEFAULT_NAME,
                'height': DEFAULT_HEIGHT,
                'uuid': str(self.test_ap.uuid),
                'no_check_radius': DEFAULT_NO_CHECK_RADIUS,
                'default_cpe_height': DEFAULT_CPE_HEIGHT,
                'feature_type': FeatureType.AP.value,
                'max_radius': DEFAULT_MAX_RADIUS,
                'height_ft': expected_height_ft,
                'max_radius_miles': expected_max_radius_miles
            }
        }
        self.get_feature_collection_flow(AccessPointLocation, AccessPointSerializer, [expected_ap])

    def test_get_features_for_user_cpe(self):
        expected_height_ft = DEFAULT_HEIGHT * 3.28084
        expected_cpe = {
            'type': 'Feature',
            'geometry': json.loads(DEFAULT_TEST_POINT),
            'properties': {
                'name': DEFAULT_NAME,
                'height': DEFAULT_HEIGHT,
                'uuid': str(self.test_cpe.uuid),
                'feature_type': FeatureType.CPE.value,
                'height_ft': expected_height_ft,
            }
        }
        self.get_feature_collection_flow(CPELocation, CPESerializer, [expected_cpe])

    def test_get_features_for_user_ap_cpe_link(self):
        expected_link = {
            'type': 'Feature',
            'geometry': json.loads(DEFAULT_TEST_LINESTRING),
            'properties': {
                'frequency': DEFAULT_FREQUENCY,
                'ap': str(self.test_ap.uuid),
                'cpe': str(self.test_cpe.uuid),
                'uuid': str(self.test_ap_cpe_link.uuid),
                'feature_type': FeatureType.AP_CPE_LINK.value
            }
        }
        self.get_feature_collection_flow(APToCPELink, APToCPELinkSerializer, [expected_link])


class WorkspaceRestViewsTestCase(WorkspaceBaseTestCase):
    def setUp(self):
        super(WorkspaceRestViewsTestCase, self).setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.testuser)

    def create_geojson_model(self, model_cls, endpoint, data):
        """Uses the POST endpoint for the model class to create a model, then check if it's in db."""

        response = self.client.post(f'{endpoint}/', data, format='json',
            HTTP_ACCEPT=JSON_CONTENT_TYPE)
        self.assertEqual(response.status_code, HTTP_201_CREATED)
        new_id = response.json()['uuid']
        return model_cls.objects.get(uuid=new_id)

    def update_geojson_model(self, model_cls, endpoint, model_id, data):
        """Uses the PATCH endpoint for the model class to create a model, then retrieve it from db."""
        response = self.client.patch(f'{endpoint}/{model_id}/', data, format='json',
            HTTP_ACCEPT=JSON_CONTENT_TYPE)
        self.assertEqual(response.status_code, HTTP_200_OK)
        return model_cls.objects.get(uuid=model_id)

    def delete_geojson_model(self, model_cls, endpoint, model_id):
        """Uses the DELETE endpoint for the model class to delete the model, then test if its deleted."""
        num_user_models = len(model_cls.objects.filter(owner=self.testuser))
        response = self.client.delete(f'{endpoint}/{model_id}/', HTTP_ACCEPT=JSON_CONTENT_TYPE)
        new_num_user_models = len(model_cls.objects.filter(owner=self.testuser))

        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)
        self.assertFalse(model_cls.objects.filter(uuid=model_id).exists())
        self.assertEqual(num_user_models - 1, new_num_user_models)

    def test_create_ap(self):
        new_ap = {
            'name': DEFAULT_NAME,
            'geojson': DEFAULT_TEST_POINT,
            'height': DEFAULT_HEIGHT,
            'max_radius': DEFAULT_MAX_RADIUS
        }
        ap = self.create_geojson_model(AccessPointLocation, AP_ENDPOINT, new_ap)
        self.assertEqual(ap.owner, self.testuser)
        self.assertEqual(ap.name, DEFAULT_NAME)
        self.assertJSONEqual(ap.geojson.json, DEFAULT_TEST_POINT)
        self.assertEqual(ap.height, DEFAULT_HEIGHT)
        self.assertEqual(ap.max_radius, DEFAULT_MAX_RADIUS)

    def test_create_cpe(self):
        new_cpe = {
            'name': DEFAULT_NAME,
            'geojson': DEFAULT_TEST_POINT,
            'height': DEFAULT_HEIGHT
        }
        cpe = self.create_geojson_model(CPELocation, CPE_ENDPOINT, new_cpe)
        self.assertEqual(cpe.owner, self.testuser)
        self.assertEqual(cpe.name, DEFAULT_NAME)
        self.assertJSONEqual(cpe.geojson.json, DEFAULT_TEST_POINT)
        self.assertEqual(cpe.height, DEFAULT_HEIGHT)

    def test_create_ap_cpe_link(self):
        new_link = {
            'frequency': DEFAULT_FREQUENCY,
            'geojson': DEFAULT_TEST_LINESTRING,
            'ap': self.test_ap.uuid,
            'cpe': self.test_cpe.uuid
        }
        link = self.create_geojson_model(APToCPELink, AP_CPE_LINK_ENDPOINT, new_link)
        self.assertEqual(link.owner, self.testuser)
        self.assertEqual(link.frequency, DEFAULT_FREQUENCY)
        self.assertJSONEqual(link.geojson.json, DEFAULT_TEST_LINESTRING)
        self.assertEqual(link.ap, self.test_ap)
        self.assertEqual(link.cpe, self.test_cpe)

    def test_update_ap(self):
        ap_id = self.test_ap.uuid
        updated_ap = {
            'name': UPDATED_NAME,
            'geojson': UPDATED_TEST_POINT,
            'height': UPDATED_HEIGHT,
            'max_radius': UPDATED_MAX_RADIUS
        }
        ap = self.update_geojson_model(AccessPointLocation, AP_ENDPOINT, ap_id, updated_ap)
        self.assertEqual(ap.owner, self.testuser)
        self.assertEqual(ap.name, UPDATED_NAME)
        self.assertJSONEqual(ap.geojson.json, UPDATED_TEST_POINT)
        self.assertEqual(ap.height, UPDATED_HEIGHT)
        self.assertEqual(ap.max_radius, UPDATED_MAX_RADIUS)

    def test_update_cpe(self):
        cpe_id = self.test_cpe.uuid
        updated_cpe = {
            'name': UPDATED_NAME,
            'geojson': UPDATED_TEST_POINT,
            'height': UPDATED_HEIGHT,
        }
        cpe = self.update_geojson_model(CPELocation, CPE_ENDPOINT, cpe_id, updated_cpe)
        self.assertEqual(cpe.owner, self.testuser)
        self.assertEqual(cpe.name, UPDATED_NAME)
        self.assertJSONEqual(cpe.geojson.json, UPDATED_TEST_POINT)
        self.assertEqual(cpe.height, UPDATED_HEIGHT)

    def test_create_ap_cpe_link(self):
        link_id = self.test_ap_cpe_link.uuid
        updated_link = {
            'frequency': UPDATED_FREQUENCY,
            'geojson': UPDATED_TEST_LINESTRING
        }
        link = self.update_geojson_model(APToCPELink, AP_CPE_LINK_ENDPOINT, link_id, updated_link)
        self.assertEqual(link.owner, self.testuser)
        self.assertEqual(link.frequency, UPDATED_FREQUENCY)
        self.assertJSONEqual(link.geojson.json, UPDATED_TEST_LINESTRING)
        self.assertEqual(link.ap, self.test_ap)
        self.assertEqual(link.cpe, self.test_cpe)

    def test_delete_geojson_models(self):
        # have to delete the AP CPE link first
        self.delete_geojson_model(APToCPELink, AP_CPE_LINK_ENDPOINT, self.test_ap_cpe_link.uuid)
        self.delete_geojson_model(AccessPointLocation, AP_ENDPOINT, self.test_ap.uuid)
        self.delete_geojson_model(CPELocation, CPE_ENDPOINT, self.test_cpe.uuid)
