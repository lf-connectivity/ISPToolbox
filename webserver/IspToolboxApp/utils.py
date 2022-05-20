from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.db import connection
from celery import current_task
from celery_async import celery_app as app
from celery.exceptions import SoftTimeLimitExceeded
from django.conf import settings
from django.db import close_old_connections
from django.db.backends.signals import connection_created


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


def _set_timeout_on_market_eval_queries_celery(sender, connection, **kwargs):
    # Give a little less time than the soft timeout for queries to run
    with connection.cursor() as cursor:
        cursor.execute(
            f"set statement_timeout={int(settings.MARKET_EVAL_TASK_SOFT_TIME_LIMIT * 1000)}"
        )


def market_evaluator_async_task(
    consumer, error_resp={"error": ERR_TIMEOUT}, is_pipeline_task=False
):
    def decorator(f):
        @app.task(soft_time_limit=settings.MARKET_EVAL_TASK_SOFT_TIME_LIMIT)
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            # hack
            if is_pipeline_task:
                channelName, uuid = args[-3], args[-2]
            else:
                channelName, uuid = args[-2], args[-1]

            # Only set DB query timeouts for tasks annotated with the decorator.
            # This to minimize chance of code breakage. Hack.
            connection_created.connect(_set_timeout_on_market_eval_queries_celery)

            try:
                f(*args, **kwargs)
            except SoftTimeLimitExceeded:
                sync_send(channelName, consumer, error_resp, uuid)
            finally:
                close_old_connections()
                connection_created.disconnect(
                    _set_timeout_on_market_eval_queries_celery
                )

        return wrapped

    return decorator
