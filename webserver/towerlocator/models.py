from django.db import models
from django.contrib.gis.db import models as gis_models
from uuid import uuid4
import secrets
import datetime
import pytz


def createTokenDefault():
    return secrets.token_urlsafe(32)


class TowerLocatorMarket(models.Model):
    uuid = models.CharField(max_length=50, default=uuid4, primary_key=True)
    location = gis_models.PointField()
    height = models.FloatField()
    coverage = gis_models.GeometryField(null=True, blank=True)
    task = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    token = models.CharField(
        max_length=50,
        default=createTokenDefault,
        editable=False)
    created = models.DateTimeField(auto_now_add=True)

    def isAccessAuthorized(self, request):
        return request.META['HTTP_AUTHORIZATION'].replace(
            'Token ', '') == self.token and (
            (datetime.datetime.utcnow().replace(
                tzinfo=pytz.utc) - self.created).total_seconds() < 604800)
