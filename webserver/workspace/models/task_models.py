from celery.result import AsyncResult
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_celery_results.models import TaskResult
from uuid import uuid4

from celery_async.celery import celery_app as app

import celery.states
import enum


class AbstractAsyncTaskAssociatedModel(models.Model):
    """
    Base class for handling task related models.
    """

    task_id = models.CharField(
        max_length=getattr(settings, "DJANGO_CELERY_RESULTS_TASK_ID_MAX_LENGTH", 255),
        unique=True,
        default=None,
        blank=True,
        null=True,
        verbose_name=_("Task ID"),
        help_text=_("Celery ID for the Task that was run"),
    )

    @property
    def task_result(self):
        try:
            return TaskResult.objects.get(task_id=self.task_id)
        except TaskResult.DoesNotExist:
            try:
                return AsyncResult(self.task_id)
            except Exception:
                return None

    def cancel_task(self):
        if self.task_id:
            app.control.revoke(self.task_id, terminate=True)

    class Meta:
        abstract = True


class AbstractAsyncTaskPrimaryKeyMixin(models.Model):
    """
    Use this mixin to have a random UUID id as a primary key
    """

    uuid = models.UUIDField(default=uuid4, primary_key=True)

    class Meta:
        abstract = True


class AbstractAsyncTaskUserMixin(models.Model):
    """
    Use this mixin to associate a task with a user
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True
    )

    class Meta:
        abstract = True


class AbstractAsyncTaskHashCacheMixin(models.Model):
    """
    Use this mixin to associate a hash with the model (for caching purposes)
    """

    hash = models.CharField(
        max_length=255,
        help_text="""
            This hash helps determine if the AP has already been computed.
        """,
    )

    def calculate_hash(self):
        raise NotImplementedError("Please implement this")

    def result_cached(self) -> bool:
        return self.hash == self.calculate_hash()

    def on_task_start(self, task_id):
        self.cancel_task()
        self.task_id = task_id
        self.save()

    def get_task_status(self):
        task_result = self.task_result
        if not self.result_cached():
            if not task_result:
                return AsyncTaskStatus.NOT_STARTED
            else:
                return AsyncTaskStatus.COMPLETED
        elif task_result:
            return AsyncTaskStatus.from_celery_task_status(task_result.status)
        else:
            return AsyncTaskStatus.COMPLETED

    def cache_result(self):
        self.hash = self.calculate_hash()
        self.save()

    class Meta:
        abstract = True


class AsyncTaskStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"
    UNKNOWN = "UNKNOWN"
    REVOKED = "REVOKED"

    @staticmethod
    def from_celery_task_status(status):
        status_map = {
            celery.states.PENDING: AsyncTaskStatus.IN_PROGRESS,
            celery.states.STARTED: AsyncTaskStatus.IN_PROGRESS,
            celery.states.RETRY: AsyncTaskStatus.IN_PROGRESS,
            celery.states.FAILURE: AsyncTaskStatus.ERROR,
            celery.states.SUCCESS: AsyncTaskStatus.COMPLETED,
            celery.states.REVOKED: AsyncTaskStatus.REVOKED,
        }
        return status_map.get(status, AsyncTaskStatus.UNKNOWN)
