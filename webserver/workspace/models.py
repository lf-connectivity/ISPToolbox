from django.db import models
from django.conf import settings
import uuid
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point


class Network(models.Model):
    name = models.CharField(max_length=100)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    created_date = models.DateField(auto_now_add=True, editable=False)
    last_edited = models.DateField(auto_now_add=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    map_center = geo_models.PointField(default=Point(-97.03125, 36.59788913307022))
    zoom_level = models.FloatField(default=3.75)

    @staticmethod
    def toFeatureCollection(data):
        return {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'geometry': {'type': 'LineString', 'coordinates': [radio['location'] for radio in link['radios']]},
                        'properties': {k: v for k, v in link.items() if k not in ['radios', 'network']}
                    } for link in data['ptplinks']
                ],
                'properties': {key: value for key, value in data.items() if key != 'ptplinks'}
            }


class Radio(models.Model):
    name = models.CharField(max_length=100)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    location = geo_models.PointField()
    installation_height = models.FloatField(default=10)


class PTPLink(models.Model):
    name = models.CharField(max_length=100)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    frequency = models.FloatField(default=2.4)
    radios = models.ManyToManyField(Radio)
    network = models.ForeignKey(Network, on_delete=models.CASCADE, related_name='ptplinks')


class ISPCompany(models.Model):
    name = models.CharField(max_length=128)
    employees = models.ManyToManyField(settings.AUTH_USER_MODEL, through='Employee')


class Employee(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    company = models.ForeignKey(ISPCompany, on_delete=models.CASCADE)
    date_joined = models.DateField()
