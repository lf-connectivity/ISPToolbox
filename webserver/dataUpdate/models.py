# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.db import models


# Class representing a data source
class Source(models.Model):
    # Source identifier i.e. rdof
    source_id = models.CharField(max_length=63)
    # Source country as ISO-1336-1 alpha-2 codes
    source_country = models.CharField(max_length=2)
    last_updated = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ["source_id", "source_country"]
