from django.db import models
from django.contrib.gis.db import models as gis_models
from django.core.validators import MaxValueValidator, MinValueValidator

import uuid


class MarketingPinConversion(models.Model):
    max_pins = 200

    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False)

    created = models.DateTimeField(auto_now_add=True)
    include = gis_models.GeometryCollectionField(null=True, blank=True)
    exclude = gis_models.GeometryCollectionField(null=True, blank=True)
    num_pins = models.IntegerField(validators=[MaxValueValidator(max_pins), MinValueValidator(0)])
    error = models.CharField(max_length=100, blank=True, null=True)

    include_output = gis_models.GeometryCollectionField(null=True, blank=True)

    class Meta:
        ordering = ('created', )
