from django.views import View
from IspToolboxApp.models.MarketEvaluatorModels import MarketEvaluatorPipeline
from IspToolboxApp.models.MLabSpeedDataModels import StandardizedMlab
from django.http import JsonResponse


class MLabSpeedView(View):
    def get(self, request):
        resp = {'error': None}
        try:
            uuid = request.GET.get('uuid', '')
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)
            area_of_interest = results.include_geojson
            resp['zip_speeds'] = StandardizedMlab.genMLabResults(area_of_interest)
            resp['error'] = None
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)
