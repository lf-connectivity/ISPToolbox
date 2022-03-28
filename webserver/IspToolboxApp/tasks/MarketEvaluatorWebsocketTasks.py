from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from IspToolboxApp.Helpers.MarketEvaluatorFunctions import serviceProviders, broadbandNow, mlabSpeed, \
    grantGeog, zipGeog, countyGeog, medianIncome, censusBlockGeog, tribalGeog
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import checkIfPrecomputedBuildingsAvailable, getMicrosoftBuildingsOffset, \
    getOSMBuildings
from gis_data.models.hrsl import HrslUsa15, HrslBra15
from IspToolboxApp.models.MarketEvaluatorModels import MarketEvaluatorPipeline
from django.contrib.humanize.templatetags.humanize import intcomma
import logging
from celery_async import celery_app as app


def sync_send(channelName, consumer, value, uuid):
    channel_layer = get_channel_layer()
    resp = {
        "uuid": uuid,
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


@app.task
def genBuildings(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(
        uuid=pipeline_uuid
    ).include_geojson.json
    buildings_available = checkIfPrecomputedBuildingsAvailable(include, None)
    if buildings_available:
        # We can query microsoft buildings with an offset and send results as we generate them.
        offset = 0
        done = False
        while not done:
            resp = getMicrosoftBuildingsOffset(include, offset, read_only)
            resp["done"] = False
            # Once we hit an offset with no more geometries, we are finished.
            # But we still send response to indicate to FE that buildings are complete.
            if len(resp["gc"]["geometries"]) == 0:
                done = True
                resp["done"] = True
            newOffset = resp["offset"]
            # Set the response offset to the original offset for FE
            resp["offset"] = str(offset)
            sync_send(channelName, "building.overlays", resp, uuid)
            offset = newOffset
    else:
        resp = getOSMBuildings(include, None)
        resp["gc"] = resp["buildings"]
        resp["done"] = True
        sync_send(channelName, "building.overlays", resp, uuid)


@app.task
def genMedianIncome(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(
        uuid=pipeline_uuid
    ).include_geojson.json
    result = {}
    averageMedianIncome = 0
    num_buildings = 0
    while not result.get("done", False):
        result = medianIncome(include, result, read_only=False)
        try:
            averageMedianIncome = (
                num_buildings * averageMedianIncome
                + result.get("averageMedianIncome", 0) * result.get("numbuildings", 1)
            ) / (num_buildings + result.get("numbuildings", 1))
        except ZeroDivisionError:
            logging.error(f"uuid: {pipeline_uuid} - produced divide by zero error")
            averageMedianIncome = 0
        num_buildings += result.get("numbuildings", 1)
        resp = {"averageMedianIncome": averageMedianIncome, "done": result["done"]}
        if "error" in result:
            resp["error"] = result["error"]
        sync_send(channelName, "median.income", resp, uuid)


@app.task
def genServiceProviders(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(
        uuid=pipeline_uuid
    ).include_geojson.json
    result = serviceProviders(include, read_only)
    sync_send(channelName, "service.providers", result, uuid)


@app.task
def genBroadbandNow(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(
        uuid=pipeline_uuid
    ).include_geojson.json
    result = broadbandNow(include, read_only)
    sync_send(channelName, "broadband.now", result, uuid)


@app.task
def genMedianSpeeds(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson
    result = StandardizedMlabGlobal.genPostalCodeSpeeds(include, read_only)
    sync_send(channelName, "median.speeds", result, uuid)


@app.task
def genPopulation(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson
    try:
        population = 0
        population += HrslUsa15.get_intersection_population(include, read_only)
        population += HrslBra15.get_intersection_population(include, read_only)
        returnval = {"population": intcomma(population), "error": 0}
    except Exception:
        returnval = {"population": "error", "error": -1}
    sync_send(channelName, "population", returnval, uuid)


@app.task
def getGrantGeog(grantId, channelName, uuid):
    result = grantGeog(grantId)
    sync_send(channelName, "grant.geog", result, uuid)


@app.task
def getZipGeog(zipcode, channelName, uuid):
    result = zipGeog(zipcode)
    sync_send(channelName, "zip.geog", result, uuid)


@app.task
def getCountyGeog(statecode, countycode, state, county, channelName, uuid):
    result = countyGeog(statecode, countycode, state, county)
    sync_send(channelName, "county.geog", result, uuid)


@app.task
def getCensusBlockGeog(blockcode, channelName, uuid):
    result = censusBlockGeog(blockcode)
    sync_send(channelName, "censusblock.geog", result, uuid)


@app.task
def getTribalGeog(geoid, namelsad, channelName, uuid):
    result = tribalGeog(geoid, namelsad)
    sync_send(channelName, "tribal.geog", result, uuid)
