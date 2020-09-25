from django.views import View
from django.http import JsonResponse

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from IspToolboxApp.Models.MarketingConvertModels import MarketingPinConversion
from IspToolboxApp.Tasks.MarketingPinConversionTasks import ConvertPins
from django.contrib.gis.geos import GEOSGeometry, WKBWriter

import math


@method_decorator(csrf_exempt, name='dispatch')
class MarketingConvertPolygons(View):
    def post(self, request):
        resp = {'error': None, 'msg': None}
        try:
            include = request.POST.get('include', {})
            exclude = request.POST.get('exclude', {})
            num_pins = request.POST.get('num_pins', 0)
            # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D
            # Geojson
            wkb_w = WKBWriter()
            wkb_w.outdim = 2
            include = GEOSGeometry(include)
            exclude = GEOSGeometry(exclude)

            conversion = MarketingPinConversion(
                include=GEOSGeometry(wkb_w.write_hex(include)),
                exclude=GEOSGeometry(wkb_w.write_hex(exclude)),
                num_pins=num_pins
            )
            conversion.save()
            ConvertPins(conversion.uuid)
            conversion.refresh_from_db()
            resp['msg'] = conversion.error
            output_pins = []
            for p in conversion.include_output:
                center = p.centroid
                output_pins += [(center.y, center.x, round(math.sqrt(p.area / math.pi) * 100))]
            resp['pins'] = output_pins

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)
