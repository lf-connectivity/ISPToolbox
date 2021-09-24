from channels.generic.websocket import AsyncJsonWebsocketConsumer
from mmwave import tasks as mmwave_tasks
from workspace import tasks as workspace_tasks
from webserver.celery import celery_app as app
import enum


class LOSConsumerMessageType(enum.Enum):
    LINK = 'link'
    AP = 'ap'
    ERROR = 'error'

    @staticmethod
    def get(enum_value, default=None):
        try:
            return LOSConsumerMessageType(enum_value)
        except ValueError:
            return default


msg_handlers = {
    LOSConsumerMessageType.LINK: [mmwave_tasks.getLinkInfo.delay],
    LOSConsumerMessageType.AP: [
        workspace_tasks.generateAccessPointCoverage.delay,
        workspace_tasks.computeViewshedCoverage.delay
    ],
    LOSConsumerMessageType.ERROR: None,
}


class LOSConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.network_id = self.scope['url_route']['kwargs']['network_id']
        self.network_group_name = 'los_check_%s' % self.network_id
        self.user = self.scope["user"]
        self.tasks_to_revoke = {
            LOSConsumerMessageType.LINK: [],
            LOSConsumerMessageType.AP: {},
        }

        # Join room group
        await self.channel_layer.group_add(
            self.network_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.network_group_name,
            self.channel_name
        )

        # Close all the tasks, recursively going down the data structure
        # to get all of them.
        def get_tasks(start):
            tasks = []
            if type(start) == dict:
                for value in start.values():
                    tasks.extend(get_tasks(value))
            elif type(start) == list:
                for item in start:
                    tasks.extend(get_tasks(item))
            else:
                tasks = [start]
            return tasks

        for task in get_tasks(self.tasks_to_revoke):
            app.control.revoke(task, terminate=True)

    # Receive message from WebSocket
    async def receive_json(self, text_data_json):
        msg_type = text_data_json.get('msg', 'error')

        # Switch Case Message Type on Different Handlers
        msg_type_enum = LOSConsumerMessageType.get(msg_type, None)

        if msg_type_enum is LOSConsumerMessageType.AP and not text_data_json.get('uuid'):
            handlers = None
        else:
            handlers = msg_handlers.get(msg_type_enum, None)

        if handlers is None:
            await self.default_msg_handler()
        else:
            # cancel previous tasks. For link tasks, cancel everything. For AP tasks,
            # cancel based on UUID of the AP.
            if msg_type_enum is LOSConsumerMessageType.LINK:
                old_tasks = self.tasks_to_revoke[LOSConsumerMessageType.LINK]
            else:
                uuid = text_data_json.get('uuid')
                old_tasks = self.tasks_to_revoke[LOSConsumerMessageType.AP].get(uuid, [
                ])

            for old_task in old_tasks:
                app.control.revoke(old_task, terminate=True)
            # start new tasks
            new_tasks = []
            for handler in handlers:
                new_task = handler(
                    self.network_id, text_data_json, self.user.id)
                new_tasks.append(new_task.id)

            # update session tasks accordingly
            if msg_type_enum is LOSConsumerMessageType.LINK:
                self.tasks_to_revoke[LOSConsumerMessageType.LINK] = new_tasks
            else:
                self.tasks_to_revoke[LOSConsumerMessageType.AP][uuid] = new_tasks

    # Receive message from room group
    async def standard_message(self, event):
        # Send message to WebSocket
        await self.send_json(event)

    async def ap_status(self, event):
        await self.send_json(event)

    async def ap_viewshed(self, event):
        await self.send_json(event)

    async def ap_viewshed_progress(self, event):
        await self.send_json(event)

    async def ap_unexpected_error(self, event):
        await self.send_json(event)

    async def default_msg_handler(self):
        await self.send_json({'error': 'Invalid request'})
