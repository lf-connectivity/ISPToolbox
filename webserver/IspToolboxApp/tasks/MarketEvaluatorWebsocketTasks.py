from IspToolboxApp.Helpers.MarketEvaluatorFunctions import (
    serviceProviders,
    broadbandNow,
    grantGeog,
    zipGeog,
    countyGeog,
    medianIncome,
    censusBlockGeog,
    tribalGeog,
)
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import (
    checkIfPrecomputedBuildingsAvailable,
    getMicrosoftBuildingsOffset,
    getOSMBuildings,
)
from IspToolboxApp.models.MLabSpeedDataModels import StandardizedMlabGlobal
from gis_data.models.hrsl import HrslUsa15, HrslBra15
from IspToolboxApp.models.MarketEvaluatorModels import MarketEvaluatorPipeline
from django.contrib.humanize.templatetags.humanize import intcomma
from django.db.utils import Error as DjangoDbBaseError
import logging

from IspToolboxApp.utils import ERR_TIMEOUT, market_evaluator_async_task, sync_send


@market_evaluator_async_task(
    "building.overlays", error_resp={"gc": None, "offset": str(ERR_TIMEOUT)}, is_pipeline_task=True
)
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


@market_evaluator_async_task("median.income", is_pipeline_task=True)
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


@market_evaluator_async_task("service.providers", is_pipeline_task=True)
def genServiceProviders(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(
        uuid=pipeline_uuid
    ).include_geojson.json
    result = serviceProviders(include, read_only)
    sync_send(channelName, "service.providers", result, uuid)


@market_evaluator_async_task("broadband.now", is_pipeline_task=True)
def genBroadbandNow(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(
        uuid=pipeline_uuid
    ).include_geojson.json
    result = broadbandNow(include, read_only)
    sync_send(channelName, "broadband.now", result, uuid)


@market_evaluator_async_task("median.speeds", is_pipeline_task=True)
def genMedianSpeeds(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson
    result = StandardizedMlabGlobal.genPostalCodeSpeeds(include, read_only)
    sync_send(channelName, "median.speeds", result, uuid)


@market_evaluator_async_task(
    "population",
    error_resp={"population": "error", "error": ERR_TIMEOUT},
    is_pipeline_task=True,
) 
def genPopulation(pipeline_uuid, channelName, uuid, read_only=False):
    include = MarketEvaluatorPipeline.objects.get(uuid=pipeline_uuid).include_geojson
    try:
        population = 0
        population += HrslUsa15.get_intersection_population(include, read_only)
        population += HrslBra15.get_intersection_population(include, read_only)
        returnval = {"population": intcomma(population), "error": 0}
    except DjangoDbBaseError:
        returnval = {"population": "error", "error": -1}
    sync_send(channelName, "population", returnval, uuid)


@market_evaluator_async_task("grant.geog")
def getGrantGeog(grantId, channelName, uuid):
    result = grantGeog(grantId)
    sync_send(channelName, "grant.geog", result, uuid)


@market_evaluator_async_task("zip.geog")
def getZipGeog(zipcode, channelName, uuid):
    result = zipGeog(zipcode)
    sync_send(channelName, "zip.geog", result, uuid)


@market_evaluator_async_task("county.geog")
def getCountyGeog(statecode, countycode, state, county, channelName, uuid):
    result = countyGeog(statecode, countycode, state, county)
    sync_send(channelName, "county.geog", result, uuid)


@market_evaluator_async_task("censusblock.geog")
def getCensusBlockGeog(blockcode, channelName, uuid):
    result = censusBlockGeog(blockcode)
    sync_send(channelName, "censusblock.geog", result, uuid)


@market_evaluator_async_task("tribal.geog")
def getTribalGeog(geoid, namelsad, channelName, uuid):
    result = tribalGeog(geoid, namelsad)
    sync_send(channelName, "tribal.geog", result, uuid)
