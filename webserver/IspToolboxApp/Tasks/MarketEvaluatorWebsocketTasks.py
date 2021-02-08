from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from IspToolboxApp.Helpers.MarketEvaluatorFunctions import serviceProviders, broadbandNow, mlabSpeed, \
    grantGeog, zipGeog, countyGeog, medianIncome
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import checkIfPrecomputedBuildingsAvailable, getMicrosoftBuildingsOffset, \
    getOSMBuildings
from towerlocator.helpers import getViewShed
from IspToolboxApp.Models.MarketEvaluatorModels import MarketEvaluatorPipeline


def sync_send(channelName, consumer, value, uuid):
    channel_layer = get_channel_layer()
    resp = {
        "uuid": uuid,
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


@shared_task
def genBuildings(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson.json
    buildings_available = checkIfPrecomputedBuildingsAvailable(include, None)
    if buildings_available:
        # We can query microsoft buildings with an offset and send results as we generate them.
        offset = 0
        done = False
        while not done:
            resp = getMicrosoftBuildingsOffset(include, offset, read_only)
            resp['done'] = False
            # Once we hit an offset with no more geometries, we are finished.
            # But we still send response to indicate to FE that buildings are complete.
            if len(resp['gc']['geometries']) == 0:
                done = True
                resp['done'] = True
            newOffset = resp['offset']
            # Set the response offset to the original offset for FE
            resp['offset'] = str(offset)
            sync_send(channelName, 'building.overlays', resp, uuid)
            offset = newOffset
    else:
        resp = getOSMBuildings(include, None)
        resp['gc'] = resp['buildings']
        resp['done'] = True
        sync_send(channelName, 'building.overlays', resp, uuid)


@shared_task
def genMedianIncome(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson.json
    result = {}
    averageMedianIncome = 0
    num_buildings = 0
    while not result.get('done', False):
        result = medianIncome(include, result, read_only=False)
        averageMedianIncome = (
            num_buildings * averageMedianIncome +
            result.get('averageMedianIncome', 0) * result.get('numbuildings', 1)
        ) / (num_buildings + result.get('numbuildings', 1))
        num_buildings += result.get('numbuildings', 1)
        resp = {'averageMedianIncome': averageMedianIncome, 'done': result['done']}
        if 'error' in result:
            resp['error'] = result['error']
        sync_send(channelName, 'median.income', resp, uuid)


@shared_task
def genServiceProviders(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson.json
    result = serviceProviders(include, read_only)
    sync_send(channelName, 'service.providers', result, uuid)


@shared_task
def genBroadbandNow(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson.json
    result = broadbandNow(include, read_only)
    sync_send(channelName, 'broadband.now', result, uuid)


@shared_task
def genMedianSpeeds(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson.json
    result = mlabSpeed(include, read_only)
    sync_send(channelName, 'median.speeds', result, uuid)


@shared_task
def getGrantGeog(grantId, channelName, uuid):
    result = grantGeog(grantId)
    sync_send(channelName, 'grant.geog', result, uuid)


@shared_task
def getZipGeog(zipcode, channelName, uuid):
    result = zipGeog(zipcode)
    sync_send(channelName, 'zip.geog', result, uuid)


@shared_task
def getCountyGeog(statecode, countycode, channelName, uuid):
    result = countyGeog(statecode, countycode)
    sync_send(channelName, 'county.geog', result, uuid)


@shared_task
def getTowerViewShed(lat, lon, height, radius, channelName, uuid):
    result = getViewShed(lat, lon, height, radius)
    sync_send(channelName, 'tower.viewshed', result, uuid)
