from workspace.models import (
    AnalyticsEvent, AnalyticsSerializer,
)
from django.views import View
import dateutil.parser
from django.core.exceptions import PermissionDenied
from rest_framework import mixins
from django.conf import settings
import json
from django.http import HttpResponse, JsonResponse


class AnalyticsView(View, mixins.ListModelMixin):
    """
    This view allows us to add workspace interactions into FB's MySQL
    """

    def validate_auth_header(self, request):
        expected_token = f'Bearer {settings.SOCIAL_AUTH_FACEBOOK_KEY}|{settings.ASN_CURL_SECRET}'
        return request.headers.get('Authorization', None) == expected_token

    def post(self, request):

        data = json.loads(request.body.decode("utf-8"))

        url = data.get('url')
        session_id = data.get('sessionId')
        event_type = data.get('eventType')

        event_data = {
            'url': url,
            'session_id': session_id,
            'event_type': event_type,
        }

        event_item = AnalyticsEvent.objects.create(**event_data)

        return HttpResponse(status=201)

    def get(self, request):
        if request.user.is_superuser or self.validate_auth_header(request):
            s = request.GET.get('after', '2020-01-01T01:00:00.000000-00:00')
            timestamp = dateutil.parser.parse(s)
            queryset = AnalyticsEvent.objects.filter(created_at__gte=timestamp)
            serializer = AnalyticsSerializer(queryset, many=True)
            return JsonResponse(serializer.data, safe=False)
        else:
            raise PermissionDenied
