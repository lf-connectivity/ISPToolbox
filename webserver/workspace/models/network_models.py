from django.contrib.gis.db.models.fields import GeometryField
from django.core.exceptions import FieldDoesNotExist
from django.db import models
from django.conf import settings
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import GEOSGeometry, LineString
from django.contrib.sessions.models import Session
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.db.models.signals import pre_save
from django.dispatch import receiver

from rest_framework import serializers

import logging
import numpy
import math
import json
import uuid

from workspace.utils.geojson_circle import createGeoJSONCircle
from .model_constants import KM_2_MI, FeatureType, M_2_FT
from mmwave.tasks.link_tasks import getDTMPoint
from mmwave.models import EPTLidarPointCloud
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine


BUFFER_DSM_EXPORT_KM = 0.5


class WorkspaceFeature(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              on_delete=models.CASCADE, null=True, blank=True)
    session = models.ForeignKey(
        Session,
        on_delete=models.SET_NULL, null=True,
        help_text="This is a django session - different than map session",
        db_column="django_session"
    )

    map_session = models.ForeignKey(
        'workspace.WorkspaceMapSession',
        on_delete=models.CASCADE,
        null=True,
        default=None,
        db_column="session"
    )
    geojson = geo_models.PointField()
    uneditable = models.BooleanField(default=False)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    @classmethod
    def get_rest_queryset(cls, request):
        user = request.user
        if request.user.is_anonymous:
            return cls.objects.filter(session=request.session.session_key)
        else:
            return (
                cls.objects.filter(owner=user) | cls.objects.filter(
                    session=request.session.session_key)
            )


class SessionWorkspaceModelMixin:
    @classmethod
    def get_features_for_session(serializer, session):
        objects = serializer.Meta.model.objects.filter(
            map_session=session).all()

        # Filter out all geometryfield model properties from properties.
        features = []
        for obj in objects:
            properties = {}
            for k, v in serializer(obj).data.items():

                # Some keys might be properties, not fields
                try:
                    model_field_type = obj._meta.get_field(k)
                except FieldDoesNotExist:
                    model_field_type = None

                if not isinstance(model_field_type, GeometryField):
                    properties[k] = v

            features.append({
                'type': 'Feature',
                'geometry': json.loads(obj.geojson.json),
                'properties': properties
            })

        return {
            'type': 'FeatureCollection',
            'features': features
        }


class AccessPointLocation(WorkspaceFeature):
    name = models.CharField(max_length=50, default="Unnamed AP")
    MAX_HEIGHT_M = 1000
    MIN_HEIGHT_M = 0.1
    height = models.FloatField(default=30, validators=[
        MinValueValidator(
            MIN_HEIGHT_M,
            message=_(
                'Ensure this value is greater than or equal to %(limit_value)s m.')
        ),
        MaxValueValidator(
            MAX_HEIGHT_M,
            message=_(
                'Ensure this value is less than or equal to %(limit_value)s. m')
        )]
    )
    MAX_RADIUS_KM = 16
    MIN_RADIUS_KM = 0
    max_radius = models.FloatField(default=2, validators=[
        MinValueValidator(MIN_RADIUS_KM,
                          message=_('Ensure this value is greater than or equal to %(limit_value)s km.')),
        MaxValueValidator(MAX_RADIUS_KM,
                          message=_('Ensure this value is less than or equal to %(limit_value)s. km'))
    ]
    )
    no_check_radius = models.FloatField(default=0.01)
    MAX_CPE_HEIGHT_M = 1000
    MIN_CPE_HEIGHT_M = 0
    default_cpe_height = models.FloatField(default=1, validators=[
        MinValueValidator(MIN_CPE_HEIGHT_M,
                          message=_('Ensure this value is greater than or equal to %(limit_value)s m.')),
        MaxValueValidator(MAX_CPE_HEIGHT_M,
                          message=_('Ensure this value is less than or equal to %(limit_value)s. m'))
    ]
    )
    cloudrf_coverage_geojson = geo_models.GeometryCollectionField(null=True)

    @property
    def lat(self):
        return self.geojson.y

    @property
    def lng(self):
        return self.geojson.x

    @property
    def radius(self):
        return self.max_radius

    @radius.setter
    def radius(self, val):
        self.max_radius = val

    @property
    def radius_miles(self):
        return self.max_radius * KM_2_MI

    @radius_miles.setter
    def radius_miles(self, val):
        self.max_radius = val / KM_2_MI

    @property
    def height_ft(self):
        return self.height * M_2_FT

    @height_ft.setter
    def height_ft(self, val):
        self.height = val / M_2_FT

    @property
    def default_cpe_height_ft(self):
        return self.default_cpe_height * M_2_FT

    @default_cpe_height_ft.setter
    def default_cpe_height_ft(self, val):
        self.default_cpe_height = val / M_2_FT

    @property
    def feature_type(self):
        return FeatureType.AP.value

    @property
    def coordinates(self):
        return f'{self.geojson.y}, {self.geojson.x}'

    @coordinates.setter
    def coordinates(self, value):
        coords = value.split(',')
        self.geojson.x = float(coords[1])
        self.geojson.y = float(coords[0])

    @property
    def cloudrf_coverage_geojson_json(self):
        return self.cloudrf_coverage_geojson.json if self.cloudrf_coverage_geojson else None

    @classmethod
    def coordinates_validator(cls, value):
        coords = value.split(',')
        if len(coords) != 2:
            raise ValidationError(
                'Coordinates must contain two values seperated by a comma. Latitude, Longitude')
        if float(coords[0]) > 90.0 or float(coords[0]) < -90.0:
            raise ValidationError(
                'Invalid latitude, latitude must be between -90 and 90.')
        if float(coords[1]) > 180.0 or float(coords[1]) < -180.0:
            raise ValidationError(
                'Invalid longitude, longitude must be between -180 and 180.')

    def get_dtm_height(self) -> float:
        return getDTMPoint(self.geojson)

    def getDSMExtentRequired(self):
        """
        Get the AOI necessary to render AP location
        """
        geo_circle = createGeoJSONCircle(self.geojson, self.max_radius)
        aoi = GEOSGeometry(json.dumps(geo_circle))
        return aoi

    def createDSMJobEnvelope(self):
        """
        Get the suggest aoi to export w/ buffer
        """
        geo_circle = createGeoJSONCircle(
            self.geojson, self.max_radius + BUFFER_DSM_EXPORT_KM)
        aoi = GEOSGeometry(json.dumps(geo_circle))
        return aoi.envelope


class AccessPointSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(
        format="%D", required=False, read_only=True)
    height_ft = serializers.FloatField(required=False, validators=[
        MinValueValidator(AccessPointLocation.MIN_HEIGHT_M * M_2_FT,
                          message=_('Ensure this value is greater than or equal to %(limit_value)s ft.')),
        MaxValueValidator(AccessPointLocation.MAX_HEIGHT_M * M_2_FT,
                          message=_('Ensure this value is less than or equal to %(limit_value)s ft.'))
    ])
    radius_miles = serializers.FloatField(required=False, validators=[
        MinValueValidator(AccessPointLocation.MIN_RADIUS_KM * KM_2_MI, message=_(
            'Ensure this value is greater than or equal to %(limit_value)s mi.')),
        MaxValueValidator(AccessPointLocation.MAX_RADIUS_KM * KM_2_MI, message=_(
            'Ensure this value is less than or equal to %(limit_value)s mi.'))
    ])
    coordinates = serializers.CharField(required=False,
                                        validators=[
                                            AccessPointLocation.coordinates_validator
                                        ]
                                        )
    feature_type = serializers.CharField(read_only=True)
    default_cpe_height_ft = serializers.FloatField(required=False, validators=[
        MinValueValidator(
            AccessPointLocation.MIN_CPE_HEIGHT_M * M_2_FT,
            message=_(
                'Ensure this value is greater than or equal to %(limit_value)s ft.')
        ),
        MaxValueValidator(
            AccessPointLocation.MAX_CPE_HEIGHT_M * M_2_FT,
            message=_(
                'Ensure this value is less than or equal to %(limit_value)s ft.')
        )
    ])
    cloudrf_coverage_geojson_json = serializers.SerializerMethodField()
    lat = serializers.FloatField(read_only=True)
    lng = serializers.FloatField(read_only=True)

    class Meta:
        model = AccessPointLocation
        exclude = ['owner', 'session', 'created']

    def update(self, instance, validated_data):
        new_height = validated_data.get('height', instance.height)
        new_radius = validated_data.get('max_radius', instance.max_radius)
        new_cpe_height = validated_data.get(
            'default_cpe_height', instance.default_cpe_height)
        new_geojson = json.loads(validated_data.get(
            'geojson', instance.geojson.json))
        new_point = new_geojson['coordinates']

        if not math.isclose(new_height, instance.height) or \
           not math.isclose(new_radius, instance.max_radius) or \
           not math.isclose(new_cpe_height, instance.default_cpe_height) or \
           not numpy.allclose(new_point, json.loads(instance.geojson.json)['coordinates']):
            new_cloudrf = None
        else:
            new_cloudrf = validated_data.get(
                'cloudrf_coverage_geojson', instance.cloudrf_coverage_geojson)

        validated_data['cloudrf_coverage_geojson'] = new_cloudrf
        return super(AccessPointSerializer, self).update(instance, validated_data)

    def get_cloudrf_coverage_geojson_json(self, obj):
        if obj.cloudrf_coverage_geojson is None:
            return None
        else:
            return obj.cloudrf_coverage_geojson.json


class CPELocation(WorkspaceFeature):
    name = models.CharField(max_length=100)
    ap = models.ForeignKey(AccessPointLocation,
                           on_delete=models.CASCADE, null=True)
    height = models.FloatField(
        help_text="""
        This height value is relative to the terrain in meters. When object is first created the height field
        is taken from the AP "default_cpe_height", it is then converted to DTM height. The following
        saves are all relative to terrain.
        """, validators=[
            MinValueValidator(0), MaxValueValidator(1000)]
    )

    @property
    def feature_type(self):
        return FeatureType.CPE.value

    def get_dsm_height(self) -> float:
        point = self.geojson
        tile_engine = DSMTileEngine(
            point, EPTLidarPointCloud.query_intersect_aoi(point))
        dsm = tile_engine.getSurfaceHeight(point)
        return dsm

    def get_dtm_height(self) -> float:
        return getDTMPoint(self.geojson)

    @property
    def height_ft(self):
        return self.height * M_2_FT

    @height_ft.setter
    def height_ft(self, value):
        self.height = value / M_2_FT


@receiver(pre_save, sender=CPELocation)
def _modify_height(sender, instance, **kwargs):
    """
    Modify the height when initially created to be relative to terrain.
    """
    if instance.created is None:
        if instance.height is None:
            instance.height = instance.ap.default_cpe_height_ft

        try:
            instance.height = (
                instance.get_dsm_height() - instance.get_dtm_height() + instance.height
            )
        except Exception as e:
            logging.error(f'Exception when modifying height: {e}')
            instance.height = instance.ap.default_cpe_height_ft


class CPESerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(
        format="%m/%d/%Y %-I:%M%p", required=False)
    height = serializers.FloatField(required=False)
    height_ft = serializers.FloatField(required=False)
    feature_type = serializers.CharField(read_only=True)
    ap = serializers.PrimaryKeyRelatedField(
        queryset=AccessPointLocation.objects.all(),
        pk_field=serializers.UUIDField()
    )

    class Meta:
        model = CPELocation
        exclude = ['owner', 'session', 'created']


class APToCPELink(WorkspaceFeature):
    frequency = models.FloatField(default=2.437, validators=[
        MinValueValidator(0), MaxValueValidator(100)])
    ap = models.ForeignKey(AccessPointLocation,
                           on_delete=models.CASCADE, editable=False)
    cpe = models.ForeignKey(
        CPELocation, on_delete=models.CASCADE, editable=False)

    @property
    def geojson(self):
        return LineString(self.ap.geojson, self.cpe.geojson, srid=self.ap.geojson.srid)

    @property
    def feature_type(self):
        return FeatureType.AP_CPE_LINK.value


class APToCPELinkSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(
        format="%m/%d/%Y %-I:%M%p", required=False)
    feature_type = serializers.CharField(read_only=True)
    ap = serializers.PrimaryKeyRelatedField(
        queryset=AccessPointLocation.objects.all(),
        pk_field=serializers.UUIDField()
    )
    cpe = serializers.PrimaryKeyRelatedField(
        queryset=CPELocation.objects.all(),
        pk_field=serializers.UUIDField()
    )

    class Meta:
        model = APToCPELink
        exclude = ['owner', 'session', 'created']


class PointToPointLink(WorkspaceFeature):
    frequency = models.FloatField(default=2.437, validators=[
        MinValueValidator(0), MaxValueValidator(100)])
    geojson = geo_models.LineStringField(validators=[])

    @property
    def feature_type(self):
        return FeatureType.PTP_LINK.value


class PointToPointLinkSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(
        format="%m/%d/%Y %-I:%M%p", required=False)
    feature_type = serializers.CharField(read_only=True)

    class Meta:
        model = PointToPointLink
        exclude = ['owner', 'session', 'created']


class CoverageArea(WorkspaceFeature):
    name = models.CharField(max_length=50, default="Area")
    geojson = geo_models.GeometryField()

    @property
    def feature_type(self):
        return FeatureType.COVERAGE_AREA.value


class CoverageAreaSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(
        format="%m/%d/%Y %-I:%M%p", required=False)
    feature_type = serializers.CharField(read_only=True)

    class Meta:
        model = CoverageArea
        exclude = ['owner', 'session', 'created']


class BuildingCoverage(models.Model):
    class CoverageStatus(models.TextChoices):
        SERVICEABLE = 'serviceable'
        UNSERVICEABLE = 'unserviceable'
        UNKNOWN = 'unknown'

    msftid = models.IntegerField(null=True, blank=True)
    geog = geo_models.GeometryField(null=True, blank=True)
    status = models.CharField(
        default=CoverageStatus.UNKNOWN,
        max_length=20,
        choices=CoverageStatus.choices
    )
    height_margin = models.FloatField(blank=True, default=0.0)


class AccessPointCoverageBuildings(models.Model):
    class CoverageCalculationStatus(models.TextChoices):
        START = 'Started'
        FAIL = 'Failed'
        COMPLETE = 'Complete'

    ap = models.OneToOneField(
        AccessPointLocation, on_delete=models.CASCADE, primary_key=True)
    status = models.CharField(
        default=CoverageCalculationStatus.START,
        max_length=20,
        choices=CoverageCalculationStatus.choices
    )
    nearby_buildings = models.ManyToManyField(
        BuildingCoverage, related_name="nearby_buildings")
    hash = models.CharField(
        max_length=255,
        help_text="""
            Hashvalue to determine if result has already been calculated
        """,
        default=""
    )
    created = models.DateTimeField(auto_now_add=True)

    def calculate_hash(self):
        return f'{self.ap.geojson.x},{self.ap.geojson.y},{self.ap.max_radius},{self.ap.height},{self.ap.default_cpe_height}'

    def result_cached(self):
        return self.hash == self.calculate_hash()

    def coverageStatistics(self) -> dict:
        serviceable = self.nearby_buildings.filter(
            status=BuildingCoverage.CoverageStatus.SERVICEABLE
        ).count()
        unserviceable = self.nearby_buildings.filter(
            status=BuildingCoverage.CoverageStatus.UNSERVICEABLE
        ).count()
        unknown = self.nearby_buildings.filter(
            status=BuildingCoverage.CoverageStatus.UNKNOWN
        ).count()
        return {
            'serviceable': serviceable,
            'unserviceable': unserviceable,
            'unknown': unknown
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


class RadioSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    class Meta:
        model = Radio
        fields = '__all__'


class PTPLink(models.Model):
    name = models.CharField(max_length=100)
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    frequency = models.FloatField(default=2.4)
    radios = models.ManyToManyField(Radio)


class PTPLinkSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    radios = RadioSerializer(many=True)

    class Meta:
        model = PTPLink
        fields = '__all__'
