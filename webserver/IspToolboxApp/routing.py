# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.urls import re_path

from IspToolboxApp.consumers import MarketEvaluatorConsumer

websocket_urlpatterns = [
    re_path(r'ws/market-evaluator/',
            MarketEvaluatorConsumer.as_asgi()),
]
