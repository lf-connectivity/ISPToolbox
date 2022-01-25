from django.db import models
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from workspace.models import AccessPointSector
from workspace.models.task_models import AbstractAsyncTaskAssociatedModel

import enum


class CloudRFAsyncTaskStatus(enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"


# TODO: Migrate cloudrf coverage into here???
class CloudRFAsyncTaskModel(AbstractAsyncTaskAssociatedModel):
    sector = models.OneToOneField(
        AccessPointSector, on_delete=models.CASCADE, related_name="cloudrf_task"
    )

    hash = models.CharField(
        max_length=255,
        help_text="""
            This hash helps determine if the AP has already been computed.
        """,
    )

    def calculate_hash(self):
        return f"""{self.sector.ap.lat:.5f},
            {self.sector.ap.lng:.5f},
            {self.sector.height:.5f},
            {self.sector.default_cpe_height:.5f},
            {self.sector.radius:.5f},
            {self.sector.heading:.5f},
            {self.sector.azimuth:.5f}
        """

    def is_obsolete(self):
        return self.hash and self.hash != self.calculate_hash()

    def on_task_start(self, task_id):
        self.task_id = task_id
        self.hash = self.calculate_hash()
        self.save()

    def get_cloudrf_coverage_status(self):
        status_map = {
            "PENDING": CloudRFAsyncTaskStatus.IN_PROGRESS,
            "STARTED": CloudRFAsyncTaskStatus.IN_PROGRESS,
            "RETRY": CloudRFAsyncTaskStatus.IN_PROGRESS,
            "FAILURE": CloudRFAsyncTaskStatus.ERROR,
            "SUCCESS": CloudRFAsyncTaskStatus.COMPLETED,
        }
        # Weird timing issue means that we have to check for obsolescence
        # before checking for cloudrf geojson
        if self.sector.cloudrf_coverage_geojson:
            return CloudRFAsyncTaskStatus.COMPLETED
        elif self.is_obsolete():
            return CloudRFAsyncTaskStatus.NOT_STARTED
        else:
            task_result = self.task_result
            if not task_result:
                return CloudRFAsyncTaskStatus.NOT_STARTED
            else:
                return status_map[task_result.status]


@receiver(post_save, sender=AccessPointSector)
def _create_cloudrf_coverage_task(
    sender, instance, created, raw, using, update_fields, **kwargs
):
    """
    Create CloudRF coverage task for new sectors
    """
    if created:
        CloudRFAsyncTaskModel.objects.create(sector=instance)
