# Tasks only here to dummy test API framework. DEV ONLY

from workspace.models import AccessPointSector
from workspace.api.models import DummyTaskModel
from .decorators import async_task_with_model

import time

@async_task_with_model(DummyTaskModel)
def dummyTask(task):
    # Get # of sectors in ap
    sectors = AccessPointSector.objects.filter(ap=task.ap)
    task.number_of_sectors = len(sectors)

    time.sleep(task.sleep_length)
    task.sleep_response =  f"Slept for {task.sleep_length} seconds"

    task.save()
