from django.db import models
from .task_models import (
    AbstractAsyncTaskAPIModel
)
from rest_framework import serializers
import redis
import json
import time
import logging
from django.conf import settings


class PointToPointServiceability(
    AbstractAsyncTaskAPIModel
):
    EXPIRE_TIME_RESULTS = 3600 * 24 * 7 * 30

    task_name = "workspace.tasks.ptp_tasks.calculate_serviceability"

    @classmethod
    def get_rest_queryset(cls, request):
        return cls.objects.filter(owner=request.user)

    ptp = models.ForeignKey(
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
            return json.loads(val)
        else:
            return val

    def calculate_hash(self):
        return f"{self.ptp.pk}|{self.ptp.geojson.json}|{self.ptp.frequency}|{self.ptp.radio0hgt}|{self.ptpradio1hgt}"

    @gis_data.setter
    def gis_data(self, val):
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        r.set(self.key_elevation_profile(), val, ex=int(time.time() + self.EXPIRE_TIME_RESULTS))

    def calculate_serviceability(self):
        try:
            # Start By Computing GIS Data
            gis_data = self.ptp.gis_data()
            self.gis_data = json.dumps(gis_data.__dict__)
            # Calculate Obstructions
            self.number_of_obstructions = self.ptp.calculate_obstructions(gis_data)
            if self.number_of_obstructions > 0:
                self.serviceable = PointToPointServiceability.Serviceability.UNSERVICEABLE
            elif self.number_of_obstructions == 0:
                self.serviceable = PointToPointServiceability.Serviceability.SERVICEABLE
            self.save()
        except Exception:
            logging.exception("error while calculating serviceability")
            raise Exception


class PointToPointLinkServiceableSerializer(serializers.ModelSerializer):
    lookup_field = "uuid"
    number_of_obstructions = serializers.IntegerField(read_only=True)
    serviceable = serializers.CharField(read_only=True)
    gis_data = serializers.CharField(read_only=True)

    class Meta:
        model = PointToPointServiceability
        fields = ['number_of_obstructions', 'serviceable', 'gis_data', 'uuid', 'status', 'ptp']
