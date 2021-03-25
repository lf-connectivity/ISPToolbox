from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MaxValueValidator, MinValueValidator

import uuid
import secrets
import datetime
import pytz


def createToken():
    return secrets.token_urlsafe(32)


class MarketingPinConversion(models.Model):
    max_pins = 200
    min_pins = 0

    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False)

    task = models.CharField(max_length=100)
    token = models.CharField(max_length=50, default=createToken, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    include = gis_models.GeometryCollectionField(null=True, blank=True)
    exclude = gis_models.GeometryCollectionField(null=True, blank=True)
    num_pins = models.IntegerField(validators=[MaxValueValidator(max_pins), MinValueValidator(min_pins)])
    error = models.CharField(max_length=100, blank=True, null=True)

    include_output = gis_models.GeometryCollectionField(null=True, blank=True)

    class Meta:
        ordering = ('created', )

    def isAccessAuthorized(self, request):
        return request.META['HTTP_AUTHORIZATION'].replace(
            'Token ', '') == self.token and (
            (datetime.datetime.utcnow().replace(
                tzinfo=pytz.utc) - self.created).total_seconds() < 604800)
