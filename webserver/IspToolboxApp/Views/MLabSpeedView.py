from django.views import View
from IspToolboxApp.Models.MarketEvaluatorModels import MarketEvaluatorPipeline
from IspToolboxApp.Models.MLabSpeedDataModels import MlabUszip1052020
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
            resp['zip_speeds'] = MlabUszip1052020.genMLabResults(area_of_interest)
            resp['error'] = None
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)
