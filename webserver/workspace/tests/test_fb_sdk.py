from django.test import TestCase, Client
from django.conf import settings
import base64
import json
import hmac
import hashlib


example_request = {
   "algorithm": "HMAC-SHA256",
   "expires": 1291840400,
   "issued_at": 1291836800,
   "user_id": "218471"
}


def createSignedRequest(request):
    req = base64.urlsafe_b64encode(json.dumps(example_request).encode('utf-8'))
    sig = base64.urlsafe_b64encode(
        hmac.new(
            bytes(settings.SOCIAL_AUTH_FACEBOOK_SECRET, 'utf-8'), req, hashlib.sha256
        ).digest()
    )
    return sig + b"." + req


class DeauthorizeFBTestCase(TestCase):
    """
    Checks that deauthorize endpoint behaves as expected,
    to update endpoint url be sure to also update @ developers.facebook.com
    """

    test_url = '/pro/fb/deauthorize-callback/'

    def test_request_deauthorize_invalid(self):
        c = Client()
        resp = c.post(self.test_url, {'signed_request': ''})
        self.assertEqual(resp.status_code, 403)

    def test_request_deauthorize_valid(self):
        c = Client()
        resp = c.post(
            self.test_url,
            {
                'signed_request': createSignedRequest(example_request).decode('utf-8')
            }
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json().get('url') is not None)
        self.assertTrue(resp.json().get('confirmation_code') is not None)


class DeleteFBTestCase(TestCase):
    """
    Checks that delete endpoint behaves as expected,
    to update endpoint url be sure to also update @ developers.facebook.com
    """

    test_url = '/pro/fb/delete-callback/'

    def test_request_deauthorize_invalid(self):
        c = Client()
        resp = c.post(self.test_url, {'signed_request': ''})
        self.assertEqual(resp.status_code, 403)

    def test_request_deauthorize_valid(self):
        c = Client()
        resp = c.post(
            self.test_url,
            {
                'signed_request': createSignedRequest(example_request).decode('utf-8')
            }
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json().get('url') is not None)
        self.assertTrue(resp.json().get('confirmation_code') is not None)
