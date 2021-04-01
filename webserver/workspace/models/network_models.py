from django.db import models
from django.conf import settings
import uuid
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point
from enum import Enum
import json

from workspace.constants import FeatureType, CoverageCalculationStatus, CoverageStatus

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


class GeoJSONModel(object):
    @classmethod
    def get_features_for_user(cls, user, serializer=None):
        objects = cls.objects.filter(owner=user).all()
        return {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': json.loads(obj.geojson.json),
                'properties': {k: v for k, v in serializer(obj).data.items() if k != 'geojson'} if serializer is not None else None,
            } for obj in objects
        ]
    }


class AccessPointLocation(models.Model, GeoJSONModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=50)
    geojson = geo_models.PointField()

    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    height = models.FloatField()
    max_radius = models.FloatField()
    no_check_radius = models.FloatField(default=0.01)
    default_cpe_height = models.FloatField(default=2)

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    @property
    def max_radius_miles(self):
        return self.max_radius * 0.621371

    @property
    def height_ft(self):
        return self.height * 3.28084

    @property
    def feature_type(self):
        return FeatureType.AP.value


class CPELocation(models.Model, GeoJSONModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    height = models.FloatField()
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    geojson = geo_models.PointField()

    @property
    def height_ft(self):
        return self.height * 3.28084

    @property
    def feature_type(self):
        return FeatureType.CPE.value


class APToCPELink(models.Model, GeoJSONModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    frequency = models.FloatField(default=2.4)
    geojson = geo_models.LineStringField()
    ap = models.ForeignKey(AccessPointLocation, on_delete=models.CASCADE, editable=False)
    cpe = models.ForeignKey(CPELocation, on_delete=models.CASCADE, editable=False)

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    @property
    def feature_type(self):
        return FeatureType.AP_CPE_LINK.value


class BuildingCoverage(models.Model):
    msftid = models.IntegerField(null=True, blank=True)
    geog = geo_models.GeometryField(null=True, blank=True)
    status = models.CharField(
        default=CoverageStatus.UNKNOWN.value,
        max_length=20,
        choices=[(tag, tag.value) for tag in CoverageStatus]
    )
    height_margin = models.FloatField(blank=True, default=0.0)


class AccessPointCoverage(models.Model):
    ap = models.ForeignKey(AccessPointLocation, on_delete=models.CASCADE)
    status = models.CharField(
        default=CoverageCalculationStatus.START.value,
        max_length=20,
        choices=[(tag, tag.value) for tag in CoverageCalculationStatus]
    )
    nearby_buildings = models.ManyToManyField(BuildingCoverage, related_name="nearby_buildings")
    created = models.DateTimeField(auto_now_add=True)


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
