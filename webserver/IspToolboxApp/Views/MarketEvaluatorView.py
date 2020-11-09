
from django.views import View
from django.contrib.gis.geos import GEOSGeometry, WKBWriter
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from IspToolboxApp.Models.MarketEvaluatorModels import MarketEvaluatorPipeline
import IspToolboxApp.Tasks.MarketEvaluatorTasks
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import\
    getMicrosoftBuildingsOffset, createPipelineFromKMZ, convertKml, getMicrosoftBuildings
from django.http import JsonResponse
import json
import logging
from rasterio.errors import RasterioIOError
from IspToolboxApp.templates.errorMsg import kmz_err_msg
import uuid as uuidv4
from IspToolboxApp.util.s3 import writeToS3, createPresignedUrl


class MarketEvaluatorPipelineBuildings(View):
    def get(self, request):
        resp = {'error': None}
        uuid = request.GET.get('uuid', '')
        buildingoffset = int(request.GET.get('offset', 0))
        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)

            buildingOutlines = json.dumps(
                {'type': 'GeometryCollection', 'geometries': []})
            buildingCount = 0
            if results.buildingPrecomputed:
                # Perform a direct Query of Building Outlines if Available
                buildingOutlines = getMicrosoftBuildingsOffset(
                    results.include_geojson.json,
                    results.exclude_geojson.json if results.exclude_geojson else results.exclude_geojson,
                    buildingoffset)
                buildingCount = len(buildingOutlines['geometries'])
                buildingOutlines = json.dumps(buildingOutlines)
            else:
                if buildingoffset == 0:
                    buildingOutlines = results.buildingPolygons.json if results.buildingPolygons else results.buildingPolygons
                    buildingCount = results.buildingCount

            resp = {
                'isOSM': not results.buildingPrecomputed,
                'buildings': buildingOutlines,
                'building_num': buildingCount,
                'building_done': results.buildingCompleted,
                'building_error': results.buildingError,
            }
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)


class MarketEvaluatorPipelineBroadbandNow(View):
    def get(self, request):
        resp = {'error': None}
        uuid = request.GET.get('uuid', '')
        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)
            resp = results.genBroadbandNow()
            resp['error'] = None
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)


class MarketEvaluatorPipelineServiceProviders(View):
    def get(self, request):
        resp = {'error': None}
        uuid = request.GET.get('uuid', '')
        offset = int(request.GET.get('offset', 0))

        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)
            resp = results.genServiceProviders(offset)
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)


class MarketEvaluatorPipelineIncome(View):
    def get(self, request):
        resp = {'error': None}
        uuid = request.GET.get('uuid', '')
        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)

        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)


@method_decorator(csrf_exempt, name='dispatch')
class MarketEvaluatorPipelineKMZ(View):
    def post(self, request):
        resp = {'error': None}
        try:
            files = request.FILES
            # TODO: LIMIT file size upload
            gc = createPipelineFromKMZ(files['kmz'])
            pipeline = MarketEvaluatorPipeline(
                include_geojson=GEOSGeometry(json.dumps(gc)))
            pipeline.save()
            resp = {
                'uuid': pipeline.uuid,
                'token': pipeline.token,
                'error': None}
            task = IspToolboxApp.Tasks.MarketEvaluatorTasks.genMarketEvaluatorData.delay(
                pipeline.uuid)
            pipeline.task = task.id
            pipeline.save(update_fields=['task'])

        except RasterioIOError:
            resp['error'] = kmz_err_msg['not_found_img']

        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)

    def get(self, request):
        resp = {'error': None}
        try:
            uuid = request.GET.get('uuid', '')
            results = MarketEvaluatorPipeline.objects.only(
                "include_geojson", "exclude_geojson").get(pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)
            else:
                resp = {
                    'error': None,
                    'include': results.include_geojson.json,
                    'exclude': results.exclude_geojson.json if results.exclude_geojson else None}
        except:  # noqa: E722
            resp['error'] = 'Failed to load pipeline'

        return JsonResponse(resp)


@method_decorator(csrf_exempt, name='dispatch')
class MarketEvaluatorPipelineView(View):
    def get(self, request):
        uuid = request.GET.get('uuid', '')
        resp = {'error': None}
        try:
            results = MarketEvaluatorPipeline.objects.only(
                "incomeServiceProvidersAvailable",
                "buildingPrecomputed",
                "buildingCompleted",
                "buildingError",
                'averageMedianIncome',
                "incomeComplete",
                "incomeError",
                "serviceProviderComplete",
                "serviceProviderError",
                'completed',
                'error').get(
                pk=uuid)
            if not results.isAccessAuthorized(request):
                return JsonResponse(resp)

            resp = {
                'incomeServiceProvidersAvailable': results.incomeServiceProvidersAvailable,
                'buildingPrecomputed': results.buildingPrecomputed,
                'buildingCompleted': results.buildingCompleted,
                'buildingError': results.buildingError,
                'averageMedianIncome': results.averageMedianIncome,
                'incomeComplete': results.incomeComplete,
                'incomeError': results.incomeError,
                'serviceProviderComplete': results.serviceProviderComplete,
                'serviceProviderError': results.serviceProviderError,
                'completed': results.completed,
                'error': results.error,
            }
        except:  # noqa: E722
            resp['error'] = 'Failed to load pipeline'

        return JsonResponse(resp)

    def post(self, request):
        body = request.body
        body_unicode = request.body.decode('utf-8')
        body = json.loads(body_unicode)
        include = body.get('include', {})
        exclude = body.get('exclude', {})

        # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D
        # Geojson
        wkb_w = WKBWriter()
        wkb_w.outdim = 2

        # Instantiate Model 'Market Evaluator Pipeline' to track progress
        include = GEOSGeometry(json.dumps(include))
        run = MarketEvaluatorPipeline(
            include_geojson=GEOSGeometry(
                wkb_w.write_hex(include)))
        run.save(update_fields=['include_geojson'])
        try:
            exclude = GEOSGeometry(json.dumps(exclude))
            run.exclude_geojson = GEOSGeometry(wkb_w.write_hex(exclude))
            run.save(update_fields=['exclude_geojson'])
        except BaseException:
            logging.info('Failed to get exclude')

        task = IspToolboxApp.Tasks.MarketEvaluatorTasks.genMarketEvaluatorData.delay(
            run.uuid)
        run.task = task.id
        run.save(update_fields=['task'])

        return JsonResponse({'uuid': run.uuid, 'token': run.token})


@method_decorator(csrf_exempt, name='dispatch')
class MarketEvaluatorExport(View):
    def post(self, request):
        uuid = request.GET.get('uuid', '')
        body = json.loads(request.body.decode('utf-8'))
        isShape = body.get('shapes', False)
        isBuildings = body.get('buildings', False)
        object_name = f'kml/{uuidv4.uuid4()}.kml'
        resp = {'error': None}
        geoList = []
        try:
            results = MarketEvaluatorPipeline.objects.get(pk=uuid)

            if not results.isAccessAuthorized(request):
                return JsonResponse({'error', 'the token is not access'})

            if not results.buildingPrecomputed:
                return JsonResponse({'error': 'building didn\'t computed yet'})

            if isShape:
                shapes = json.loads(results.include_geojson.json)
                shapes['layer'] = 'shape'
                geoList.append(shapes)
            if isBuildings:
                buildingOutlines = getMicrosoftBuildings(
                    results.include_geojson.json, None)
                buildingOutlines['buildings']['layer'] = 'buildings'
                geoList.append(buildingOutlines['buildings'])
            kml = convertKml(geoList)
            succee = writeToS3(kml, object_name)
            if not succee:
                return JsonResponse({'error': 'fail to upload to S3'})
            url = createPresignedUrl(object_name)
            resp = {'url': url}

        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)
