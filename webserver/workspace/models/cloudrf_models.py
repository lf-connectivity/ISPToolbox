from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver

from workspace.models import AccessPointSector
from workspace.models.task_models import (
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskHashCacheMixin,
    AsyncTaskStatus,
)


# TODO: Migrate cloudrf coverage into here???
class CloudRFAsyncTaskModel(
    AbstractAsyncTaskAssociatedModel, AbstractAsyncTaskHashCacheMixin
):
    sector = models.OneToOneField(
        AccessPointSector, on_delete=models.CASCADE, related_name="cloudrf_task"
    )

    def calculate_hash(self):
        return f"""{self.sector.ap.lat:.5f},
            {self.sector.ap.lng:.5f},
            {self.sector.height:.5f},
            {self.sector.height_ft:.5f},
            {self.sector.default_cpe_height:.5f},
            {self.sector.default_cpe_height_ft:.5f},
            {self.sector.radius:.5f},
            {self.sector.radius_miles:.5f},
            {self.sector.heading:.5f},
            {self.sector.azimuth:.5f}
        """

    def is_obsolete(self):
        return self.hash and self.hash != self.calculate_hash()

    def get_cloudrf_coverage_status(self):
        # Weird timing issue means that we have to check for obsolescence
        # before checking for cloudrf geojson
        if self.sector.cloudrf_coverage_geojson:
            return AsyncTaskStatus.COMPLETED
        elif self.is_obsolete():
            return AsyncTaskStatus.NOT_STARTED
        else:
            task_result = self.task_result
            if not task_result:
                return AsyncTaskStatus.NOT_STARTED
            else:
                return AsyncTaskStatus.from_celery_task_status(task_result.status)


@receiver(post_save, sender=AccessPointSector)
def _create_cloudrf_coverage_task(
    sender, instance, created, raw, using, update_fields, **kwargs
):
    """
    Create CloudRF coverage task for new sectors
    """
    if created:
        CloudRFAsyncTaskModel.objects.create(sector=instance)


@receiver(pre_delete, sender=AccessPointSector)
def _cancel_cloudrf_coverage_task(sender, instance, using, **kwargs):
    """
    Cancel CloudRF coverage task for deleted sectors
    """
    try:
        CloudRFAsyncTaskModel.objects.get(sector=instance).cancel_task()
    except CloudRFAsyncTaskModel.DoesNotExist:
        pass
