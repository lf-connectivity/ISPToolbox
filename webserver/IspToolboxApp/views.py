from django.shortcuts import render
import IspToolboxApp.tasks as tasks
from django.views import View
from IspToolboxApp.models import BuildingDetection
from django.core.serializers import serialize
from django.forms.models import model_to_dict
import json
from django.contrib.gis.geos import GEOSGeometry

from celery import current_app
from IspToolboxApp.Views.market_evaluator_views.MarketEvaluator import *
from IspToolboxApp.Views.market_evaluator_views.GrantViews import *
from IspToolboxApp.Views.mmWaveViews import *
from IspToolboxApp.Views.mmWavePlannerViews import *
from IspToolboxApp.Views.MarketEvaluatorView import MarketEvaluatorPipelineKMZ, MarketEvaluatorPipelineBroadbandNow, MarketEvaluatorPipelineView, MarketEvaluatorPipelineBuildings, MarketEvaluatorPipelineServiceProviders, MarketEvaluatorPipelineIncome

from django.http import HttpResponse, JsonResponse

# Create your views here.

class SocialLoginView(View):
    def get(self, request):
        return render(request, 'index.html')

def index(request):
    # Get Area of Interest From Client
    geojson = request.GET.get('geojson', '{}')
    # Create Async Task through Celery and Respond with the Task ID
    run = BuildingDetection(input_geometryCollection=GEOSGeometry(geojson))
    run.save()
    task = tasks.createBuildingsGeojson.delay(geojson, run.pk)
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


