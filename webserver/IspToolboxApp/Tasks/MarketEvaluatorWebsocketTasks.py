from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from IspToolboxApp.Helpers.MarketEvaluatorFunctions import serviceProviders, broadbandNow, mlabSpeed, \
    grantGeog, zipGeog, countyGeog
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import checkIfPrecomputedBuildingsAvailable, getMicrosoftBuildingsOffset, \
    getOSMBuildings


def sync_send(channelName, consumer, value, uuid):
    channel_layer = get_channel_layer()
    resp = {
        "uuid": uuid,
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


@shared_task
def genBuildings(include, channelName, uuid):
    buildings_available = checkIfPrecomputedBuildingsAvailable(include, None)
    if buildings_available:
        # We can query microsoft buildings with an offset and send results as we generate them
        offset = 0
        while True:
            resp = getMicrosoftBuildingsOffset(include, offset)
            if len(resp['gc']['geometries']) == 0:
                break
            offset = resp['offset']
            sync_send(channelName, 'building.overlays', resp, uuid)
    else:
        resp = getOSMBuildings(include, None)
        sync_send(channelName, 'building.overlays', resp, uuid)


@shared_task
def genServiceProviders(include, channelName, uuid):
    result = serviceProviders(include)
    sync_send(channelName, 'service.providers', result, uuid)


@shared_task
def genBroadbandNow(include, channelName, uuid):
    result = broadbandNow(include)
    sync_send(channelName, 'broadband.now', result, uuid)


@shared_task
def genMedianSpeeds(include, channelName, uuid):
    result = mlabSpeed(include)
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
