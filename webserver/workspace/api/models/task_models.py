from django.db import models
from rest_framework import serializers

from celery_async import celery_app as app
from workspace.models.task_models import (
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskUserMixin,
    AbstractAsyncTaskPrimaryKeyMixin,
    AsyncTaskStatus,
)

import json


class AsyncTaskAPIModel(
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskUserMixin,
    AbstractAsyncTaskPrimaryKeyMixin,
):
    task_type = models.CharField(max_length=512)

    @classmethod
    def create_task(cls, task_user, task_type, task_input):
        if not task_user or not task_type:
            raise ValueError("Missing task_user, task_name or task_type")

        task_api_model = cls(owner=task_user, task_type=task_type)

        if task_input:
            if not isinstance(task_input, str):
                task = app.send_task(task_type, kwargs=task_input)
            else:
                task = app.send_task(task_type, (task_input,))
        else:
            task = app.send_task(task_type)

        task_api_model.task_id = task.id
        task_api_model.save()

        return task_api_model

    @property
    def status(self):
        task_result = self.task_result
        if not task_result:
            return AsyncTaskStatus.ERROR.value
        else:
            return AsyncTaskStatus.from_celery_task_status(task_result.status).value

    @property
    def result(self):
        status = self.status
        if status == AsyncTaskStatus.COMPLETED.value:
            task_result = self.task_result
            return json.loads(task_result.result)
        else:
            return None


class AsyncTaskAPIModelCreateSuccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = AsyncTaskAPIModel
        fields = ["uuid"]


class AsyncTaskAPIModelResultsSerializer(serializers.ModelSerializer):
    status = serializers.ReadOnlyField()
    result = serializers.ReadOnlyField()

    class Meta:
        model = AsyncTaskAPIModel
        fields = [
            "uuid",
            "status",
            "result",
        ]
