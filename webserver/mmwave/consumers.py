from channels.generic.websocket import AsyncJsonWebsocketConsumer
from celery.task.control import revoke
from mmwave import tasks as mmwave_tasks
from workspace import tasks as workspace_tasks


msg_handlers = {
    'link': [mmwave_tasks.getLinkInfo.delay],
    'ap': [
        workspace_tasks.generateAccessPointCoverage.delay,
        workspace_tasks.computeViewshedCoverage.delay
    ],
    'error': None,
}


class LOSConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.network_id = self.scope['url_route']['kwargs']['network_id']
        self.network_group_name = 'los_check_%s' % self.network_id
        self.user = self.scope["user"]
        self.session_tasks = {
            'link': [],
            'ap': [],
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

        # Close all the tasks
        for _, tasks in self.session_tasks.items():
            for task in tasks:
                revoke(task, terminate=True)

    # Receive message from WebSocket
    async def receive_json(self, text_data_json):
        message = text_data_json.get('msg', 'error')

        # Switch Case Message Type on Different Handlers
        handlers = msg_handlers.get(message, None)
        if handlers is None:
            await self.default_msg_handler()
        else:
            # cancel previous tasks
            old_tasks = self.session_tasks.get(message)
            for old_task in old_tasks:
                revoke(old_task, terminate=True)
            # start new tasks
            new_tasks = []
            for handler in handlers:
                new_task = handler(self.network_id, text_data_json, self.user.id)
                new_tasks.append(new_task.id)
            self.session_tasks.update({
                message: new_tasks
            })

    # Receive message from room group
    async def standard_message(self, event):
        # Send message to WebSocket
        await self.send_json(event)

    async def ap_status(self, event):
        await self.send_json(event)

    async def ap_viewshed(self, event):
        await self.send_json(event)

    async def default_msg_handler(self):
        await self.send_json({'error': 'Invalid request'})
