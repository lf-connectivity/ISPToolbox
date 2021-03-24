from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point
from .validators import validate_zoom_level


class ISPCompany(models.Model):
    name = models.CharField(max_length=128)
    employees = models.ManyToManyField(settings.AUTH_USER_MODEL, through='Employee')


class Employee(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    company = models.ForeignKey(ISPCompany, on_delete=models.CASCADE)
    date_joined = models.DateField()


class NetworkMapPreferences(models.Model):
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59788913307022))
    zoom = models.FloatField(default=3.75, validators=[validate_zoom_level])

    # Datetime Fields
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
