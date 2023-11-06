# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase, Client
from IspToolboxApp.views.RetargetingPixelView import marketing_api_secret
import json


class TestMarketingViews(TestCase):
    def test_views(self):
        client = Client()
        # Verify that Authorization Secret Required and Working
        response = client.post('/marketing/account/',
                               {'fbid': 123529807},
                               HTTP_AUTHORIZATION='Token ' + 'invalid_token')
        self.assertEqual(response.status_code, 401)
        response = client.post('/marketing/account/', {'fbid': 123529807})
        self.assertEqual(response.status_code, 401)

        # Verify that Marketing Account Creation Working
        response = client.post('/marketing/account/',
                               {'fbid': 123529807},
                               HTTP_AUTHORIZATION='Token ' + marketing_api_secret)
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        self.assertIs(content['error'], None)
        self.assertTrue(len(content['uuid']) > 20)

        # Verify that Marketing Account Creation Working
        response = client.post('/marketing/account/',
                               {'fbid': 123529807},
                               HTTP_AUTHORIZATION='Token ' + marketing_api_secret)
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        self.assertIs(content['error'], None)
        self.assertTrue(len(content['uuid']) > 20)

        # Verify that Marketing Audience Creation Working
        audience_creation_body['account'] = content['uuid']
        response = client.post(
            '/marketing/audience/',
            audience_creation_body,
            HTTP_AUTHORIZATION='Token ' +
            marketing_api_secret)
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        self.assertIs(content['error'], None)

        created_audience = content['audience']
        self.assertTrue(len(created_audience) > 20)

        response = client.get('/marketing/geocheck/',
                              {'audience': created_audience,
                               'lng': -121.31970405578612,
                               'lat': 38.00035618059361},
                              HTTP_AUTHORIZATION='Token ' + marketing_api_secret)
        self.assertEqual(response.status_code, 200)
        content = json.loads(response.content)
        self.assertIs(content['error'], None)
        self.assertTrue(content['covered'])

        response = client.get('/marketing/geocheck/',
                              {'audience': created_audience,
                               'lng': -121.31970405578612,
                               'lat': 38.00035618059361})
        self.assertEqual(response.status_code, 401)


audience_creation_body = {'include': """{
    "type":"Polygon",
    "coordinates":
    [
        [
            [-121.31489753723145,38.02077915927757],
            [-121.35111808776855,38.004819966413194],
            [-121.35446548461914,37.97634176237577],
            [-121.30528450012206,37.96125262956143],
            [-121.2846851348877,37.98256597180672],
            [-121.31489753723145,38.02077915927757]
          ]
    ]
}"""}
