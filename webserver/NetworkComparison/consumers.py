from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
from django.contrib.gis.geos import GEOSGeometry, WKBWriter
from .tasks import genPolySize, genBuildingCount


class NetworkCompConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content):
        include = content['include']
        # exclude = content['exclude']

        # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D
        # Geojson
        wkb_w = WKBWriter()
        wkb_w.outdim = 2

        include = GEOSGeometry(json.dumps(include))
        include = GEOSGeometry(wkb_w.write_hex(include))
        # if exclude is not None:
        #     exclude = GEOSGeometry(json.dumps(exclude))
        #     exclude = GEOSGeometry(wkb_w.write_hex(include))

        genPolySize.delay(include.json, None, self.channel_name)
        genBuildingCount.delay(include.json, None, self.channel_name)

    async def polygon_area(self, event):
        await self.send_json(event)

    async def building_count(self, event):
        await self.send_json(event)
