# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.conf import settings


def validate_auth_header(request):
    expected_token = f'Bearer {settings.SOCIAL_AUTH_FACEBOOK_KEY}|{settings.ASN_CURL_SECRET}'
    return request.headers.get('Authorization', None) == expected_token
