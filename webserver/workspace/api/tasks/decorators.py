# (c) Meta Platforms, Inc. and affiliates. Copyright
from celery import current_task
from celery_async import celery_app as app
from functools import wraps


def async_task_with_model(model_cls):
    def decorator(f):
        @app.task
        @wraps(f)
        def wrapped(task_id):
            task_model = model_cls.objects.get(uuid=task_id)
            task_model.task_id = current_task.request.id
            task_model.save()
            return f(task_model)

        return wrapped

    return decorator
