from channels.generic.websocket import AsyncJsonWebsocketConsumer
from .tasks import getLOSProfile

msg_handlers = {
    'ptp': getLOSProfile.delay
}


class LOSConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.network_id = self.scope['url_route']['kwargs']['network_id']
        self.network_group_name = 'los_check_%s' % self.network_id
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

    # Receive message from WebSocket
    async def receive_json(self, text_data_json):
        message = text_data_json['msg']
        # Switch Case Message Type on Different Handlers
        handler = msg_handlers.get(message, self.default_msg_handler)
        handler(self.network_id, text_data_json)

    # Receive message from room group
    async def standard_message(self, event):
        # message = event['message']
        # Send message to WebSocket
        await self.send_json(event)

    async def default_msg_handler(self, data):
        await self.send_json({'error': 'Invalid request'})
