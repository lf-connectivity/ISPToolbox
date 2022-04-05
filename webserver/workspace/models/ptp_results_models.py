from django.db import models
from workspace.models.task_models import (
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskUserMixin,
    AbstractAsyncTaskPrimaryKeyMixin,
    AbstractAsyncTaskHashCacheMixin
)
from rest_framework import serializers
import redis
import json
import time
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from celery_async import celery_app as app


class PointToPointServiceability(
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskUserMixin,
    AbstractAsyncTaskPrimaryKeyMixin,
    AbstractAsyncTaskHashCacheMixin,
):
    EXPIRE_TIME_RESULTS = 3600 * 24 * 7 * 30

    @classmethod
    def get_rest_queryset(cls, request):
        return cls.objects.filter(owner=request.user)

    ptp = models.OneToOneField(
        "workspace.PointToPointLink",
        on_delete=models.CASCADE,
        null=False,
    )

    class Serviceability(models.TextChoices):
        UNKNOWN = "UNKNOWN"
        SERVICEABLE = "SERVICEABLE"
        UNSERVICEABLE = "UNSERVICEABLE"

    serviceable = models.CharField(
        default=Serviceability.UNKNOWN,
        max_length=20,
        choices=Serviceability.choices
    )

    number_of_obstructions = models.PositiveIntegerField(
        null=True,
        blank=True,
        default=None
    )

    def key_elevation_profile(self):
        return f'ptp-gis-store-{self.uuid}'

    @property
    def gis_data(self):
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        val = r.get(self.key_elevation_profile())
        if val is not None:
            return json.load(val)
        else:
            return val

    def calculate_hash(self):
        return "123"

    @gis_data.setter
    def gis_data(self, val):
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        r.set(self.key_elevation_profile(), val, ex=int(time.time() + self.EXPIRE_TIME_RESULTS))

    def calculate_serviceability(self):
        self.gis_data = json.dumps({"test": 1234})
        self.number_of_obstructions = 3
        self.save()


@receiver(signal=post_save, sender=PointToPointServiceability)
def __gen_serviceability(
    sender, instance, created, raw, using, update_fields, **kwargs
):
    """
    Update coverage after modifying AP location
    """
    app.send_task("workspace.tasks.ptp_tasks.calculate_serviceability", (instance.uuid,))


class PointToPointLinkServiceableSerializer(serializers.ModelSerializer):
    lookup_field = "uuid"
    number_of_obstructions = serializers.IntegerField(read_only=True)
    serviceable = serializers.CharField(read_only=True)
    gis_data = serializers.CharField(read_only=True)

    class Meta:
        model = PointToPointServiceability
        fields = ['number_of_obstructions', 'serviceable', 'gis_data', 'uuid', 'task_status', 'ptp']
