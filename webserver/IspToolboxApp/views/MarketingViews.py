# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.views import View
from django.http import JsonResponse, HttpResponseForbidden

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.contrib.gis.geos import GEOSGeometry, WKBWriter

from IspToolboxApp.models.MarketingConvertModels import MarketingPinConversion
from IspToolboxApp.tasks.MarketingPinConversionTasks import ConvertPins

from celery import current_app

import math


@method_decorator(csrf_exempt, name='dispatch')
class MarketingConvertPolygons(View):
    def post(self, request):
        resp = {'error': None, 'uuid': None, 'token': None}
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
            task = ConvertPins.delay(conversion.uuid)
            conversion.task = task.id
            conversion.save(update_fields=['task'])
            resp['uuid'] = conversion.uuid
            resp['token'] = conversion.token
        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)

    def get(self, request):
        resp = {'error': None, 'status': None, 'pins': None}
        try:
            uuid = request.GET.get('uuid', None)
            conversion = MarketingPinConversion.objects.get(uuid=uuid)
            if not conversion.isAccessAuthorized(request):
                return HttpResponseForbidden()

            if conversion.include_output is not None:
                output_pins = []
                for p in conversion.include_output:
                    center = p.centroid
                    output_pins += [(center.y, center.x, round(math.sqrt(p.area / math.pi) * 100))]
                resp['pins'] = output_pins
            else:
                resp['status'] = current_app.AsyncResult(conversion.task).status
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)
