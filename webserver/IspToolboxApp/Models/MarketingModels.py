from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point

import uuid

class MarketingAccount(models.Model):
    # Meta Data
    uuid = models.UUIDField(primary_key=True, default = uuid.uuid4, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    fbid = models.BigIntegerField(editable=False)

class MarketingAudience(models.Model):
    # Meta Data
    uuid = models.UUIDField(primary_key=True, default = uuid.uuid4, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    account = models.ForeignKey(MarketingAccount, on_delete=models.CASCADE)

    # Area of Interest
    include_geojson = gis_models.GeometryField()
    exclude_geojson = gis_models.GeometryField(null=True, blank=True)

    def checkUserInside(self, longitude, latitude):
        try:
            pt = Point(longitude, latitude)
            intersects_include = pt.intersects(self.include_geojson)
            intersects_exclude = pt.intersects(self.exclude_geojson) if self.exclude_geojson else False
            if intersects_include and not intersects_exclude:
                return True
            else:
                return False

        except Exception as e:
            return False

