# (c) Meta Platforms, Inc. and affiliates. Copyright
from celery_async import celery_app as app
from workspace.api import models as workspace_models
from celery.utils.log import get_task_logger

TASK_LOGGER = get_task_logger(__name__)


@app.task
def calculate_serviceability(pk: str):
    TASK_LOGGER.info(f"Calculating serviceability for link '{pk}' ")
    link = workspace_models.PointToPointServiceability.objects.get(pk=pk)
    link.calculate_serviceability()
