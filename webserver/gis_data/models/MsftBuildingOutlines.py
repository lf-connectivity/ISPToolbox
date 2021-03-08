from django.db import models
from django.contrib.gis.db import models as gis_models


# unmanaged models
class MsftBuildingOutlines(models.Model):
    province = models.TextField(blank=True, null=True)
    geog = gis_models.PolygonField(geography=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'microsoft_building_outlines'
