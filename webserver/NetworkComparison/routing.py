# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/network-comparison/', consumers.NetworkCompConsumer.as_asgi()),
]
