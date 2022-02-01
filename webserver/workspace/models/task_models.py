from celery.result import AsyncResult
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django_celery_results.models import TaskResult
from uuid import uuid4

from webserver.celery import celery_app as app

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
        self.task_id = task_id
        self.hash = self.calculate_hash()
        self.save()

    class Meta:
        abstract = True


class AsyncTaskStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"

    @staticmethod
    def from_celery_task_status(status):
        status_map = {
            "PENDING": AsyncTaskStatus.IN_PROGRESS,
            "STARTED": AsyncTaskStatus.IN_PROGRESS,
            "RETRY": AsyncTaskStatus.IN_PROGRESS,
            "FAILURE": AsyncTaskStatus.ERROR,
            "SUCCESS": AsyncTaskStatus.COMPLETED,
        }
        return status_map[status]
