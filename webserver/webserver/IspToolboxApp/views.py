from django.shortcuts import render
from webserver.IspToolboxApp.tasks import createBuildingsGeojson
from django.views import View
from webserver.IspToolboxApp.models import BuildingDetection
from django.core.serializers import serialize
from django.forms.models import model_to_dict
import json
from django.contrib.gis.geos import GEOSGeometry

from celery import current_app
from webserver.IspToolboxApp.Views.market_evaluator_views.MarketEvaluator import *
from webserver.IspToolboxApp.Views.market_evaluator_views.GrantViews import *
from webserver.IspToolboxApp.Views.mmWaveViews import *
from webserver.IspToolboxApp.Views.mmWavePlannerViews import *

from django.http import HttpResponse, JsonResponse

# Create your views here.

class SocialLoginView(View):
    @csp_update( STYLE_SRC=["'self'",'https://connect.facebook.net','https://stackpath.bootstrapcdn.com',"https://api.mapbox.com" ,"'sha256-79N6gSeZI5t5qx+vbMcu8ufgWx5WX0+dxsLp2JgNxy0='", "'sha256-tsYFq5pUcggQKFXnvmlvUrk8MgTJLL1Gjnqenv201b8='"],SCRIPT_SRC=["'self'",'http://connect.facebook.net', 'https://api.mapbox.com', 'https://code.jquery.com', 'https://cdnjs.cloudflare.com/', 'https://stackpath.bootstrapcdn.com',"'unsafe-inline'"],IMG_SRC=['data: blob:'], CHILD_SRC=['blob:'], WORKER_SRC=['blob:'], CONNECT_SRC=['https://*.tiles.mapbox.com', 'https://api.mapbox.com', 'https://events.mapbox.com'])
    def get(self, request):
        return render(request, 'index.html')

def index(request):
    # Get Area of Interest From Client
    geojson = request.GET.get('geojson', '{}')
    # Create Async Task through Celery and Respond with the Task ID
    run = BuildingDetection(input_geometryCollection=GEOSGeometry(geojson))
    run.save()
    task = createBuildingsGeojson.delay(geojson, run.pk)
    run.task = task.id
    run.save()

    # Instantiate Model 'Building Detection' to track progress
    return JsonResponse({'taskid': task.id})

class HealthCheckView(View):
    def get(self, request):
        return HttpResponse()

class TaskView(View):
    def get(self, request, task_id):
        task = current_app.AsyncResult(task_id)
        response_data = {'task_status': task.status, 'task_id': task.id}

        if task.status == 'SUCCESS':
            response_data['results'] = task.get()

        return JsonResponse(response_data)


class ProgressView(View):
    def get(self, request, task_id):
        task = current_app.AsyncResult(task_id)
        response_data = {'task_status': task.status, 'task_id': task.id}
        pipeline = BuildingDetection.objects.get(task=task_id)
        if pipeline:
            filtered_fields = list(filter(lambda x: (
                x != 'output_geometryCollection' and x != 'input_geometryCollection'), [field.name for field in pipeline._meta.fields]))
            response_data['progress'] = model_to_dict(pipeline, fields=filtered_fields)
            response_data['progress']['created'] = pipeline.created

        if task.status == 'SUCCESS':
            response_data['results'] = task.get()

        return JsonResponse(response_data)


class ResultView(View):
    def get(self, request, task_id):
        task = current_app.AsyncResult(task_id)
        pipeline = BuildingDetection.objects.get(task=task_id)
        if pipeline and pipeline.output_geometryCollection != None:
            return JsonResponse({'result': json.loads(pipeline.output_geometryCollection.geojson)})
        return JsonResponse({'result': None})


