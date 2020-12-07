from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
from datetime import datetime
import pytz
from django.contrib.gis.geos import GEOSGeometry, WKBWriter
from .Tasks.MarketEvaluatorWebsocketTasks import genBuildings, genMedianIncome, genServiceProviders, genBroadbandNow, \
    genMedianSpeeds, getGrantGeog, getZipGeog, getCountyGeog
from IspToolboxApp.Models.MarketEvaluatorModels import MarketEvaluatorPipeline, WebsocketToken
from celery.task.control import revoke
from asgiref.sync import sync_to_async


class MarketEvaluatorConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.taskList = []
        self.authenticated = False
        self.funcSwitch = {
            'standard_polygon': self.standard_polygon_request,
            'grant': self.grant_geography_request,
            'zip': self.zip_geography_request,
            'county': self.county_geography_request,
        }
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def authenticate(self, content):
        '''
            Should be called by client onopen event as the first request after connecting to the websocket.
            Attempts to connect via either a pre-existing token or credentials.
            Params:
                content: {
                    token?<String>: A pre-existing token that the client is providing (they are probably reconnecting)
                    credentials?: Authentication credentials (will be implemented with Workspace
                        as we currently don't require user authentication)
                }
        '''
        if 'token' in content:
            tokens = await sync_to_async(WebsocketToken.objects.filter)(token=content['token'])
            # Check if token exists
            if await sync_to_async(tokens.count)():
                tokenObject = await sync_to_async(WebsocketToken.objects.get)(token=content['token'])
                # Check if token is not expired
                now = datetime.now()
                expiry = tokenObject.expiry
                now = pytz.UTC.localize(now)
                if now < expiry:
                    self.authenticated = True
                    response = {
                        'type': 'auth.token',
                        'value': {
                            'token': tokenObject.token,
                        }
                    }
                else:
                    response = {
                        'type': 'auth.token',
                        'value': {
                            'error': "TokenExpired"
                        }
                    }
                await self.send_json(response)

        elif 'credentials' in content:
            # TODO: Validate credentials before assigning a token when ISPToolbox Workspace is implemented
            tokenObject = await sync_to_async(WebsocketToken.objects.create)()
            self.authenticated = True
            response = {
                'type': 'auth.token',
                'value': {
                    'token': tokenObject.token,
                }
            }
            await self.send_json(response)

    async def receive_json(self, content):
        '''
            Handles incoming json on the websocket and routes requests based on request_type param in JSON
        '''
        if not self.authenticated:
            await self.authenticate(content)
        elif 'request_type' in content and 'uuid' in content:
            await self.funcSwitch[content['request_type']](content, content['uuid'])

    async def standard_polygon_request(self, content, uuid):
        # Cancel all old Market Evaluator celery tasks and reset tasklist.
        revoke(self.taskList, terminate=True)
        self.taskList = []
        include = None
        # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D
        # Geojson
        wkb_w = WKBWriter()
        wkb_w.outdim = 2
        include = content['include']
        include = GEOSGeometry(json.dumps(include))
        include = GEOSGeometry(wkb_w.write_hex(include))
        # Instantiate a pipeline to track geojson being processed in orm
        pipeline = MarketEvaluatorPipeline(include_geojson=include)
        await sync_to_async(pipeline.save)()
        include = include.json

        # Call async tasks and get their task IDs
        self.taskList.append(genBuildings.delay(include, self.channel_name, uuid).id)
        self.taskList.append(genMedianIncome.delay(include, self.channel_name, uuid).id)
        self.taskList.append(genServiceProviders.delay(include, self.channel_name, uuid).id)
        self.taskList.append(genMedianSpeeds.delay(include, self.channel_name, uuid).id)
        self.taskList.append(genBroadbandNow.delay(include, self.channel_name, uuid).id)

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

    async def building_overlays(self, event):
        await self.send_json(event)

    async def median_income(self, event):
        await self.send_json(event)

    async def service_providers(self, event):
        await self.send_json(event)

    async def median_speeds(self, event):
        await self.send_json(event)

    async def broadband_now(self, event):
        await self.send_json(event)

    async def grant_geog(self, event):
        await self.send_json(event)

    async def zip_geog(self, event):
        await self.send_json(event)

    async def county_geog(self, event):
        await self.send_json(event)

    async def send_auth(self, event):
        await self.send_json(event)
