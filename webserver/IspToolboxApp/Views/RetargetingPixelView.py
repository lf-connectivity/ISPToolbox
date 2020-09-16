from django.views import View
from django.http import JsonResponse
from IspToolboxApp.models import MarketingAccount, MarketingAudience
from django.contrib.gis.geos import GEOSGeometry
import json

class MarketingAccountView(View):
    def post(self, request):
        resp = {'error' : None}
        try:
            request.GET.get('fbid', None)
            request.GET.get('access_token', None)
        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)

class MarketingAudienceView(View):
    def get(self, request):
        resp = {'error' : None}
        try:

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)

    def post(self, request):
        resp = {'error' : None}
        try:
            request.GET.get('include', None)
            request.GET.get('exclude', None)

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)
    
class MarketingAudienceGeoPixelCheck(View):
    def get(self, request):
        resp = {'error' : None}
        try:

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)