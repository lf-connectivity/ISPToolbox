from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
from django.contrib.gis.geos import GEOSGeometry, WKBWriter
from .tasks.MarketEvaluatorWebsocketTasks import (
    genBuildings, genMedianIncome, genServiceProviders, genBroadbandNow,
    genMedianSpeeds, getGrantGeog, getZipGeog, getCountyGeog, getCensusBlockGeog,
    getTowerViewShed, getTribalGeog, genPopulation
)
from NetworkComparison.tasks import genPolySize
from IspToolboxApp.models.MarketEvaluatorModels import MarketEvaluatorPipeline
from asgiref.sync import sync_to_async
from IspToolboxApp.util.validate_user_input import (
    validateUserInputMarketEvaluator, InvalidMarketEvaluatorRequest
)
from webserver.celery import celery_app as app


class MarketEvaluatorConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        self.taskList = []
        self.authenticated = False
        self.funcSwitch = {
            'standard_polygon': self.standard_polygon_request,
            'grant': self.grant_geography_request,
            'zip': self.zip_geography_request,
            'county': self.county_geography_request,
            'viewshed': self.viewshed_request,
            'census_block': self.census_block_geography_request,
            'tribal': self.tribal_geography_request,
        }
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content):
        '''
            Handles incoming json on the websocket and routes requests based on request_type param in JSON
        '''
        if 'request_type' in content and 'uuid' in content:
            await self.funcSwitch[content['request_type']](content, content['uuid'])

    async def standard_polygon_request(self, content, uuid):
        # Cancel all old Market Evaluator celery tasks and reset tasklist.
        app.control.revoke(self.taskList, terminate=True)
        self.taskList = []
        include = None
        # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D
        # Geojson
        wkb_w = WKBWriter()
        wkb_w.outdim = 2
        include = content['include']
        include = GEOSGeometry(json.dumps(include))
        include = GEOSGeometry(wkb_w.write_hex(include))

        run_query_read_only = False
        # Validate User Input
        try:
            validateUserInputMarketEvaluator(include.json)
        except InvalidMarketEvaluatorRequest:
            run_query_read_only = True
        except Exception:
            await self.send_json({
                'value': 'Couldn\'t process request',
                'type': 'error',
                'uuid': uuid
            })
            return

        # Instantiate a pipeline to track geojson being processed in orm
        pipeline = MarketEvaluatorPipeline(include_geojson=include)
        await sync_to_async(pipeline.save)()

        self.taskList.append(genBuildings.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)
        self.taskList.append(genMedianIncome.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)
        self.taskList.append(genServiceProviders.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)
        self.taskList.append(genMedianSpeeds.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)
        self.taskList.append(genBroadbandNow.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)
        self.taskList.append(genPolySize.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)
        self.taskList.append(genPopulation.delay(
            pipeline.uuid, self.channel_name, uuid, run_query_read_only).id)

    async def grant_geography_request(self, content, uuid):
        grantId = content['cbgid']
        getGrantGeog.delay(grantId, self.channel_name, uuid)

    async def zip_geography_request(self, content, uuid):
        zipcode = content['zip']
        getZipGeog.delay(zipcode, self.channel_name, uuid)

    async def county_geography_request(self, content, uuid):
        countycode = content['countycode']
        statecode = content['statecode']
        getCountyGeog.delay(statecode, countycode, self.channel_name, uuid)

    async def census_block_geography_request(self, content, uuid):
        blockcode = content['blockcode']
        getCensusBlockGeog.delay(blockcode, self.channel_name, uuid)

    async def tribal_geography_request(self, content, uuid):
        geoid = content['geoid']
        getTribalGeog.delay(geoid, self.channel_name, uuid)

    async def viewshed_request(self, content, uuid):
        lat = content['lat']
        lon = content['lon']
        height = content['height']
        customerHeight = content['customerHeight']
        radius = content['radius']
        apUuid = content.get('apUuid', None)
        getTowerViewShed.delay(
            lat, lon, height, customerHeight, radius, self.channel_name, uuid, apUuid)

    async def building_overlays(self, event):
        await self.send_json(event)

    async def median_income(self, event):
        await self.send_json(event)

    async def service_providers(self, event):
        await self.send_json(event)

    async def median_speeds(self, event):
        await self.send_json(event)

    async def population(self, event):
        await self.send_json(event)

    async def broadband_now(self, event):
        await self.send_json(event)

    async def grant_geog(self, event):
        await self.send_json(event)

    async def zip_geog(self, event):
        await self.send_json(event)

    async def county_geog(self, event):
        await self.send_json(event)

    async def censusblock_geog(self, event):
        await self.send_json(event)

    async def tribal_geog(self, event):
        await self.send_json(event)

    async def tower_viewshed(self, event):
        await self.send_json(event)

    async def polygon_area(self, event):
        await self.send_json(event)
