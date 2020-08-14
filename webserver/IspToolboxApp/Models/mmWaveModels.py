from django.db import models
from django.contrib.gis.db import models as gis_models
from django.conf import settings

# Create your models here.

class NetworkPlan(models.Model):
    ## Simple Metadata
    name = models.CharField(max_length=100, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )

    ## GIS Data
    designArea = gis_models.GeometryField()
    popLocations = gis_models.GeometryField()
    buildingLocations = gis_models.GeometryCollectionField(blank=True, null=True)

    def __str__(self):
        return self.name