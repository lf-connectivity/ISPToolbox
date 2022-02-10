from celery import Celery
from django.http.response import Http404
from django.views import View
from django.http import JsonResponse
from workspace.utils.api_validate_request import validate_auth_header


class CeleryQueueLengthView(View):
    def get(self, request):
        if request.user.is_superuser or validate_auth_header(request):
            result = {}
            for q in Celery._queues:
                result[q] = Celery._redis.llen(q)
                return JsonResponse(result)
        else:
            raise Http404