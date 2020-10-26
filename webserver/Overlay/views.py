from django.views import View
from django.http import JsonResponse
from Overlay.models import Overlay


class OverlaySource(View):
    def get(self, request):
        type = request.GET.get('type', '')
        if not type:
            return JsonResponse({
                'error': 'overlay type not found'
            })
        overlay = Overlay.getLatestOverlay(type)
        if not overlay:
            return JsonResponse({
                'error': 'overlay type not found'
            })
        return JsonResponse({
            'sourceUrl': overlay.source_url,
            'sourceLayer': overlay.source_layer
        })
