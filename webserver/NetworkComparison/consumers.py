from channels.generic.websocket import AsyncJsonWebsocketConsumer
import json
from django.contrib.gis.geos import GEOSGeometry, WKBWriter
from .tasks import genPolySize, genBuildingCount, genClusteredBuildings
from celery.task.control import revoke


class NetworkCompConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.taskList = []
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive_json(self, content):
        '''
            Handles incoming json on the websocket
        '''
        # Cancel all old Network Comparison celery tasks and reset tasklist.
        revoke(self.taskList)
        self.taskList = []
        include = None
        exclude = None
        feUUID = None
        # Reduce Dimensions of Inputs to 2, Just in Case User uploads 3D
        # Geojson
        wkb_w = WKBWriter()
        wkb_w.outdim = 2
        if 'include' in content:
            include = content['include']
            include = GEOSGeometry(json.dumps(include))
            include = GEOSGeometry(wkb_w.write_hex(include))
            include = include.json
        if 'exclude' in content:
            exclude = content['exclude']
            exclude = GEOSGeometry(json.dumps(exclude))
            exclude = GEOSGeometry(wkb_w.write_hex(exclude))
            exclude = exclude.json
        if 'uuid' in content:
            feUUID = content['uuid']
        if 'cluster' in content:
            minpoints = content['cluster']['minpoints']
            distance = content['cluster']['distance']
            clusterId = genClusteredBuildings.delay(include, exclude, distance, minpoints, self.channel_name, feUUID).id
            self.taskList.append(clusterId)

        # Call async tasks and get their task IDs
        self.taskList.append(genPolySize.delay(include, exclude, self.channel_name, feUUID).id)
        self.taskList.append(genBuildingCount.delay(include, exclude, self.channel_name, feUUID).id)

    async def polygon_area(self, event):
        await self.send_json(event)

    async def building_count(self, event):
        await self.send_json(event)

    async def building_clusters(self, event):
        await self.send_json(event)
