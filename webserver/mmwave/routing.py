# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path(r'ws/los/<uuid:network_id>/', consumers.LOSConsumer.as_asgi()),
]
