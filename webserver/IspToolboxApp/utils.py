from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from celery_async import celery_app as app
from celery.exceptions import SoftTimeLimitExceeded
from django.conf import settings

import functools


ERR_TIMEOUT = -100


def sync_send(channelName, consumer, value, uuid):
    channel_layer = get_channel_layer()
    resp = {
        "uuid": uuid,
        "type": consumer,
        "value": value,
    }
    async_to_sync(channel_layer.send)(channelName, resp)


def market_evaluator_async_task(consumer, error_resp={'error': ERR_TIMEOUT}, is_pipeline_task=False):
    def decorator(f):
        @app.task(soft_time_limit=settings.MARKET_EVAL_TASK_SOFT_TIME_LIMIT)
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            # hack
            if is_pipeline_task:
                channelName, uuid = args[-3], args[-2]
            else:
                channelName, uuid = args[-2], args[-1]

            try:
                f(*args, **kwargs)
            except SoftTimeLimitExceeded:
                sync_send(channelName, consumer, error_resp, uuid)

        return wrapped

    return decorator
