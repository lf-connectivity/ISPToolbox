
from django.views import View
from django.contrib.gis.geos import GEOSGeometry, GeometryCollection, WKBWriter
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from IspToolboxApp.models import MarketEvaluatorPipeline
from IspToolboxApp.Tasks.MarketEvaluatorTasks import genMarketEvaluatorData
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getMicrosoftBuildingsOffset
from django.http import JsonResponse
import json
import logging

class MarketEvaluatorPipelineBuildings(View):
    def get(self, request):
        resp = {'error' : None}
        uuid = request.GET.get('uuid', '')
        buildingoffset = int(request.GET.get('offset', 0 ))
        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)

            buildingOutlines = json.dumps({'type' : 'GeometryCollection' , 'geometries' : []})
            buildingCount = 0
            if results.buildingPrecomputed:
                # Perform a direct Query of Building Outlines if Available
                buildingOutlines = getMicrosoftBuildingsOffset(
                    results.include_geojson.json,
                    results.exclude_geojson.json if results.exclude_geojson else results.exclude_geojson,
                    buildingoffset
                )
                buildingCount = len(buildingOutlines['geometries'])
                buildingOutlines = json.dumps(buildingOutlines)
            else:
                if buildingoffset == 0:
                    buildingOutlines = results.buildingPolygons.json if results.buildingPolygons else results.buildingPolygons
                    buildingCount = results.buildingCount
 
            resp = {
                'isOSM' : not results.buildingPrecomputed,
                'buildings':  buildingOutlines,
                'building_num' : buildingCount,
                'building_done' : results.buildingCompleted,
                'building_error' : results.buildingError,
            }
        except Exception as e:
            resp['error'] = str(e)
            
        return JsonResponse(resp)

class MarketEvaluatorPipelineServiceProviders(View):
    def get(self, request):
        resp = {'error' : None}
        uuid = request.GET.get('uuid', '')
        offset = int(request.GET.get('offset', 0 ))

        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)
            resp = results.genServiceProviders(offset)
        except Exception as e:
            resp['error'] = str(e)
            
        return JsonResponse(resp)

class MarketEvaluatorPipelineIncome(View):
    def get(self, request):
        resp = {'error' : None}
        uuid = request.GET.get('uuid', '')
        offset = int(request.GET.get('offset', 0 ))
        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)

        except Exception as e:
            resp['error'] = str(e)
            
        return JsonResponse(resp)

@method_decorator(csrf_exempt, name='dispatch')
class MarketEvaluatorPipelineView(View):
    def get(self, request):
        uuid = request.GET.get('uuid', '')
        resp = {'error' : None}
        try:
            results = MarketEvaluatorPipeline.objects.only("incomeServiceProvidersAvailable","buildingPrecomputed", "buildingCompleted", "buildingError",  'averageMedianIncome', "incomeComplete", "incomeError","serviceProviderComplete","serviceProviderError",'completed','error').get(pk=uuid)
            resp = {
                'incomeServiceProvidersAvailable' : results.incomeServiceProvidersAvailable,
                'buildingPrecomputed' : results.buildingPrecomputed,
                'buildingCompleted' : results.buildingCompleted,
                'buildingError' : results.buildingError,
                'averageMedianIncome' : results.averageMedianIncome,
                'incomeComplete' : results.incomeComplete,
                'incomeError' : results.incomeError,
                'serviceProviderComplete' : results.serviceProviderComplete,
                'serviceProviderError': results.serviceProviderError,
                'completed': results.completed,
                'error': results.error,
            }
        except Exception as e:
            resp['error'] = 'Failed to load pipeline'

        return JsonResponse(resp)
    
    def post(self, request):
        body = request.body
        body_unicode = request.body.decode('utf-8')
        body = json.loads(body_unicode)
        include = body.get('include', {})
        exclude = body.get('exclude', {})

        # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D Geojson
        wkb_w = WKBWriter()
        wkb_w.outdim = 2

        # Instantiate Model 'Market Evaluator Pipeline' to track progress
        include = GEOSGeometry(json.dumps(include))
        run = MarketEvaluatorPipeline(include_geojson=GEOSGeometry(wkb_w.write_hex(include)))
        run.save(update_fields=['include_geojson'])
        try:
            exclude = GEOSGeometry(json.dumps(exclude))
            run.exclude_geojson = GEOSGeometry(wkb_w.write_hex(exclude))
            run.save(update_fields=['exclude_geojson'])
        except:
            logging.info('Failed to get exclude')
        
        task = genMarketEvaluatorData.delay(run.uuid)
        run.task = task.id
        run.save(update_fields=['task'])

        return JsonResponse({'uuid': run.uuid})
