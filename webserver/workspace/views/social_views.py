from django.urls import reverse
from django.views import View
from django.http import JsonResponse
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import PermissionDenied

import hmac
import hashlib
import base64
import json


def fb_decode(data):
    return base64.urlsafe_b64decode(
        data + '=' * (4 - len(data) % 4)
    )


# https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/
def fb_parse_request(request):
    fb_req = request.POST.get('signed_request')
    encoded_signature, payload = fb_req.split(".", 2)
    signature = fb_decode(encoded_signature)
    fb_app_secret = settings.SOCIAL_AUTH_FACEBOOK_SECRET

    if signature == hmac.new(bytes(fb_app_secret, 'utf-8'), bytes(payload, 'utf-8'), hashlib.sha256).digest():
        return json.loads(fb_decode(payload).decode('utf-8'))
    else:
        return None


@method_decorator(csrf_exempt, name='dispatch')
class FBDeauthorizeSocialView(View):
    def get(self, request):
        raise PermissionDenied

    def post(self, request):
        try:
            fb_request = fb_parse_request(request)
        except Exception:
            raise PermissionDenied

        if fb_request is None:
            raise PermissionDenied
        code = ''
        url = 'https://isptoolbox.io' + reverse("account_view")
        resp = {'url': url, 'confirmation_code': code}
        return JsonResponse(resp)


@method_decorator(csrf_exempt, name='dispatch')
class FBDataDeletionView(View):
    def get(self, request):
        raise PermissionDenied

    def post(self, request):
        try:
            fb_request = fb_parse_request(request)
        except Exception:
            raise PermissionDenied

        if fb_request is None:
            raise PermissionDenied
        code = ''
        url = 'https://isptoolbox.io' + reverse("account_view")
        resp = {'url': url, 'confirmation_code': code}
        return JsonResponse(resp)
