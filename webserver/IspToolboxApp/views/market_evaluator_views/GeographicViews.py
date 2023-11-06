# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.views import View
from django.http import JsonResponse
from gis_data.models import Tl2019UsZcta510, Tl2019UsCounty


class SelectZipView(View):
    def get(self, request):
        '''
            Returns geojson for provided zipcode.
        '''
        zipcode = request.GET.get('zip', '-1')
        resp = {'error': -1}
        try:
            resp['geojson'] = Tl2019UsZcta510.getZipGeog(zipcode)
            resp['zip'] = zipcode
        except BaseException:
            resp = {'error': -2}
        return JsonResponse(resp)


class SelectCountyView(View):
    def get(self, request):
        '''
            Returns geojson for provided statecode and countycode.
        '''
        statecode = request.GET.get('statecode', '-1')
        countycode = request.GET.get('countycode', '-1')
        resp = {'error': -1}
        try:
            resp['geojson'] = Tl2019UsCounty.getCountyGeog(countycode, statecode)
        except BaseException:
            resp = {'error': -2}
        return JsonResponse(resp)
