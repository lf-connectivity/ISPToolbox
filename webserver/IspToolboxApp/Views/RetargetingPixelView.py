from django.views import View
from django.http import JsonResponse

class MarketingAccountView(View):
    def get(self, request):
        return JsonResponse({})

    def post(self, request):
        return JsonResponse({})

class MarketingAudienceView(View):
    def get(self, request):
        return JsonResponse({})

    def post(self, request):
        return JsonResponse({})
    
class MarketingAudienceGeoPixelCheck(View):
    def get(self, request):
        return JsonResponse({})