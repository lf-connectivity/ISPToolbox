# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.conf import settings
from django.db import models
from storages.backends.s3boto3 import S3Boto3Storage
from django_celery_results.models import TaskResult
from celery.result import AsyncResult
from django.utils.translation import gettext_lazy as _
from uuid import uuid4

from celery_async import celery_app as app


class AccessInformationJob(models.Model):
    """
    Object used to handle requests for data from users
    """
    bucket_name = 'isptoolbox-export-file'

    id = models.UUIDField(default=uuid4, primary_key=True)

    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              on_delete=models.CASCADE, null=True)
    created = models.DateTimeField(auto_now_add=True)
    completed = models.DateTimeField(blank=True, default=None, null=True)

    task_id = models.CharField(
        max_length=getattr(
            settings,
            'DJANGO_CELERY_RESULTS_TASK_ID_MAX_LENGTH',
            255
        ),
        unique=True,
        default=None,
        blank=True,
        null=True,
        verbose_name=_('Task ID'),
        help_text=_('Celery ID for the Task that was run'))

    def access_your_info_path(instance, filename):
        if settings.PROD:
            return f'ayi/{instance.id}/{filename}'
        else:
            return f'ayi-dev/{instance.id}/{filename}'

    data_dump = models.FileField(
        storage=S3Boto3Storage(
            location='', custom_domain=None, bucket_name=bucket_name),
        upload_to=access_your_info_path)

    @property
    def task_result(self):
        try:
            return TaskResult.objects.get(task_id=self.task_id)
        except TaskResult.DoesNotExist:
            try:
                return AsyncResult(self.task_id)
            except Exception:
                return None

    def startExportTask(self):
        task = app.send_task(
            'workspace.tasks.ayi_dyi_tasks.createUserDataDownload', (self.id,))
        self.task_id = task.id
        self.save(update_fields=['task_id'])


class DeleteInformationJob(models.Model):
    """
    Object used to handle requests to delete user
    """
    id = models.UUIDField(default=uuid4, primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE, null=True)

    task_id = models.CharField(
        max_length=getattr(
            settings,
            'DJANGO_CELERY_RESULTS_TASK_ID_MAX_LENGTH',
            255
        ),
        unique=True,
        default=None,
        blank=True,
        null=True,
        verbose_name=_('Task ID'),
        help_text=_('Celery ID for the Task that was run'))

    def startUserDataDeletion(self):
        task = app.send_task(
            'workspace.tasks.ayi_dyi_tasks.deleteUser', (self.id,))
        self.task_id = task.id
        self.save(update_fields=['task_id'])
