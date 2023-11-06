# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.views import View
from django.http import JsonResponse, HttpResponse
from IspToolboxApp.models.MarketingModels import MarketingAccount, MarketingAudience
from django.contrib.gis.geos import GEOSGeometry
from django.utils.decorators import method_decorator


def authMarketingAPI(view):
    """
    View Decorator Verify header includes secret key in side HTTP_AUTHORIZATION
    """
    def wrapper(request, *args, **kwargs):
        if 'HTTP_AUTHORIZATION' in request.META:
            if(request.META['HTTP_AUTHORIZATION'].replace('Token ', '') == marketing_api_secret):
                return view(request, *args, **kwargs)
        response = HttpResponse()
        response.status_code = 401
        return response
    return wrapper


@method_decorator(authMarketingAPI, name='dispatch')
class MarketingAccountView(View):
    def post(self, request):
        resp = {'error': None}
        try:
            fbid = request.POST.get('fbid', None)
            account = MarketingAccount.objects.get_or_create(fbid=fbid)
            resp['uuid'] = account[0].uuid
        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)


@method_decorator(authMarketingAPI, name='dispatch')
class MarketingAudienceView(View):
    def get(self, request):
        resp = {'error': None}
        try:
            uuid = request.GET.get('uuid', None)
            resp['uuid'] = uuid
        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)

    def post(self, request):
        resp = {'error': None}
        try:
            include = request.POST.get('include', {})
            exclude = request.POST.get('exclude', None)
            uuid = request.POST.get('account', None)
            account = MarketingAccount(pk=uuid)
            targeting_audience = MarketingAudience(
                include_geojson=GEOSGeometry(include), account=account)
            if exclude is not None:
                targeting_audience.exclude_geojson = GEOSGeometry(exclude)
            targeting_audience.save()
            resp['audience'] = targeting_audience.uuid

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)


@method_decorator(authMarketingAPI, name='dispatch')
class MarketingAudienceGeoPixelCheck(View):
    def get(self, request):
        resp = {'error': None}
        try:
            audience = request.GET.get('audience', None)
            lat = float(request.GET.get('lat', None))
            lng = float(request.GET.get('lng', None))
            audience_to_check = MarketingAudience.objects.get(pk=audience)
            user_inside = audience_to_check.checkUserInside(lng, lat)
            resp['covered'] = user_inside

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)
