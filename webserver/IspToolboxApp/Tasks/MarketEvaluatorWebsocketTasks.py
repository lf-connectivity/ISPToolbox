from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from IspToolboxApp.Helpers.MarketEvaluatorFunctions import serviceProviders, broadbandNow, mlabSpeed, \
    grantGeog, zipGeog, countyGeog, medianIncome
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import checkIfPrecomputedBuildingsAvailable, getMicrosoftBuildingsOffset, \
    getOSMBuildings
from towerlocator.helpers import getViewShed


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
        # We can query microsoft buildings with an offset and send results as we generate them.
        offset = 0
        done = False
        while not done:
            resp = getMicrosoftBuildingsOffset(include, offset)
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
def genMedianIncome(include, channelName, uuid):
    result = medianIncome(include)
    sync_send(channelName, 'median.income', result, uuid)


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


@shared_task
def getTowerViewShed(lat, lon, height, radius, channelName, uuid):
    result = getViewShed(lat, lon, height, radius)
    sync_send(channelName, 'tower.viewshed', result, uuid)
