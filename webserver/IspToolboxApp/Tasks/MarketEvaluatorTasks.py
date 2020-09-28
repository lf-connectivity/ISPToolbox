from celery import shared_task
from IspToolboxApp.Models.MarketEvaluatorModels import MarketEvaluatorPipeline
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import checkIfPrecomputedBuildingsAvailable, \
    checkIfIncomeProvidersAvailable, queryBuildingOutlines
from django.contrib.gis.geos import GEOSGeometry
import json

from datetime import datetime


@shared_task
def genMarketEvaluatorData(uuid):
    isOSM = genPrecomputedBuilingsAvailable(uuid)
    if not isOSM:
        genBuildingOutlines(uuid)
    else:
        pipelineStatus = MarketEvaluatorPipeline.objects.get(pk=uuid)
        pipelineStatus.buildingCompleted = datetime.now()
        pipelineStatus.save(update_fields=['buildingCompleted'])

    genServiceProviders.delay(uuid)
    genMedianIncome.delay(uuid)

    pipelineStatus = MarketEvaluatorPipeline.objects.get(pk=uuid)
    pipelineStatus.completed = datetime.now()
    pipelineStatus.save(update_fields=['completed'])
    return uuid


@shared_task
def genPrecomputedBuilingsAvailable(uuid):
    pipelineStatus = MarketEvaluatorPipeline.objects.get(pk=uuid)
    pipelineStatus.buildingPrecomputed = checkIfPrecomputedBuildingsAvailable(
        pipelineStatus.include_geojson.json,
        pipelineStatus.exclude_geojson.json if pipelineStatus.exclude_geojson else pipelineStatus.exclude_geojson)
    pipelineStatus.incomeServiceProvidersAvailable = checkIfIncomeProvidersAvailable(
        pipelineStatus.include_geojson.json,
        pipelineStatus.exclude_geojson.json if pipelineStatus.exclude_geojson else pipelineStatus.exclude_geojson)
    pipelineStatus.save(
        update_fields=[
            'buildingPrecomputed',
            'incomeServiceProvidersAvailable'])
    return pipelineStatus.buildingPrecomputed


@shared_task
def genBuildingOutlines(uuid):
    pipelineStatus = MarketEvaluatorPipeline.objects.get(pk=uuid)

    def callbackUpdateProgress(buildingCount, buildingPolygons):
        pipelineStatus.buildingCount = buildingCount
        pipelineStatus.buildingPolygons = GEOSGeometry(
            json.dumps(buildingPolygons))
        pipelineStatus.save(
            update_fields=[
                'buildingCount',
                'buildingPolygons'])

    buildingOutlinesResponse = queryBuildingOutlines(
        pipelineStatus.include_geojson,
        pipelineStatus.exclude_geojson,
        callback=callbackUpdateProgress)

    if buildingOutlinesResponse['error'] is None:
        pipelineStatus.buildingCount = len(
            buildingOutlinesResponse['buildings']['geometries'])
        pipelineStatus.buildingPolygons = GEOSGeometry(
            json.dumps(buildingOutlinesResponse['buildings']))
        pipelineStatus.buildingCompleted = datetime.now()
        pipelineStatus.save(
            update_fields=[
                'buildingCount',
                'buildingPolygons',
                'buildingCompleted'])
    else:
        pipelineStatus.buildingCompleted = datetime.now()
        pipelineStatus.error = buildingOutlinesResponse['error']
        pipelineStatus.save(
            update_fields=[
                'buildingCount',
                'buildingPolygons',
                'buildingCompleted'])

    return None


@shared_task
def genServiceProviders(uuid):
    pipelineStatus = MarketEvaluatorPipeline.objects.get(pk=uuid)
    pipelineStatus.serviceProviderComplete = datetime.now()
    pipelineStatus.save(update_fields=['serviceProviderComplete'])
    return None


@shared_task
def genMedianIncome(uuid):
    pipelineStatus = MarketEvaluatorPipeline.objects.get(pk=uuid)
    pipelineStatus.genMarketEvaluatorIncome()
    pipelineStatus.incomeComplete = datetime.now()
    pipelineStatus.save(update_fields=['incomeComplete'])
    return None
