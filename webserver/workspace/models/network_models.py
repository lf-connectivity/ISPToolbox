from django.db import models
from django.conf import settings
from rest_framework import serializers
import uuid
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import GEOSGeometry, LineString
import json
from django.db.models.signals import pre_save
from django.dispatch import receiver
from workspace.utils.geojson_circle import createGeoJSONCircle
from .model_constants import FeatureType, M_2_FT
from mmwave.tasks.link_tasks import getDTMPoint
from mmwave.models import EPTLidarPointCloud
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
from django.contrib.sessions.models import Session

BUFFER_DSM_EXPORT_KM = 0.5


class WorkspaceFeature(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
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
                cls.objects.filter(owner=user) | cls.objects.filter(session=request.session.session_key)
            )


class SessionWorkspaceModelMixin:
    @classmethod
    def get_features_for_session(serializer, session):
        objects = serializer.Meta.model.objects.filter(map_session=session).all()
        return {
            'type': 'FeatureCollection',
            'features': [
                {
                    'type': 'Feature',
                    'geometry': json.loads(obj.geojson.json),
                    'properties': {k: v for k, v in serializer(obj).data.items() if k != 'geojson'} if serializer else None
                } for obj in objects
            ]
        }


class AccessPointLocation(WorkspaceFeature):
    name = models.CharField(max_length=50)
    height = models.FloatField()
    max_radius = models.FloatField()
    no_check_radius = models.FloatField(default=0.01)
    default_cpe_height = models.FloatField(default=1)

    @property
    def max_radius_miles(self):
        return self.max_radius * 0.621371

    @property
    def height_ft(self):
        return self.height * M_2_FT

    @property
    def default_cpe_height_ft(self):
        return self.default_cpe_height * M_2_FT

    @property
    def feature_type(self):
        return FeatureType.AP.value

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
        geo_circle = createGeoJSONCircle(self.geojson, self.max_radius + BUFFER_DSM_EXPORT_KM)
        aoi = GEOSGeometry(json.dumps(geo_circle))
        return aoi.envelope


class AccessPointSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    height_ft = serializers.FloatField(read_only=True)
    max_radius_miles = serializers.FloatField(read_only=True)
    feature_type = serializers.CharField(read_only=True)
    default_cpe_height_ft = serializers.FloatField(read_only=True)

    class Meta:
        model = AccessPointLocation
        exclude = ['owner', 'session', 'created']


class CPELocation(WorkspaceFeature):
    name = models.CharField(max_length=100)
    ap = models.ForeignKey(AccessPointLocation, on_delete=models.CASCADE, null=True)
    height = models.FloatField(
        help_text="""
        This height value is relative to the terrain in meters. When object is first created the height field
        is taken from the AP "default_cpe_height", it is then converted to DTM height. The following
        saves are all relative to terrain.
        """
    )

    @property
    def feature_type(self):
        return FeatureType.CPE.value

    def get_dsm_height(self) -> float:
        point = self.geojson
        tile_engine = DSMTileEngine(point, EPTLidarPointCloud.query_intersect_aoi(point))
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
        instance.height = (
            instance.get_dsm_height() - instance.get_dtm_height() + instance.height
        )


class CPESerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
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
    frequency = models.FloatField(default=2.437)
    ap = models.ForeignKey(AccessPointLocation, on_delete=models.CASCADE, editable=False)
    cpe = models.ForeignKey(CPELocation, on_delete=models.CASCADE, editable=False)

    @property
    def geojson(self):
        return LineString(self.ap.geojson, self.cpe.geojson)

    @property
    def feature_type(self):
        return FeatureType.AP_CPE_LINK.value


class APToCPELinkSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
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


class CoverageArea(WorkspaceFeature):
    geojson = geo_models.GeometryField()

    @property
    def feature_type(self):
        return FeatureType.COVERAGE_AREA.value


class CoverageAreaSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    feature_type = serializers.CharField(read_only=True)

    class Meta:
        model = CoverageArea
        exclude = ['owner', 'session', 'created']


class AccessPointBasedCoverageArea(WorkspaceFeature):
    geojson = geo_models.GeometryCollectionField()
    ap = models.ForeignKey(AccessPointLocation, on_delete=models.CASCADE, editable=False)

    @property
    def feature_type(self):
        return FeatureType.AP_COVERAGE_AREA.value


class APCoverageAreaSerializer(serializers.ModelSerializer, SessionWorkspaceModelMixin):
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    feature_type = serializers.CharField(read_only=True)
    ap = serializers.PrimaryKeyRelatedField(
        queryset=AccessPointLocation.objects.all(),
        pk_field=serializers.UUIDField())

    class Meta:
        model = AccessPointBasedCoverageArea
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

    ap = models.OneToOneField(AccessPointLocation, on_delete=models.CASCADE, primary_key=True)
    status = models.CharField(
        default=CoverageCalculationStatus.START,
        max_length=20,
        choices=CoverageCalculationStatus.choices
    )
    nearby_buildings = models.ManyToManyField(BuildingCoverage, related_name="nearby_buildings")
    hash = models.CharField(
        max_length=255,
        help_text="""
            Hashvalue to determine if result has already been calculated
        """,
        default=""
    )
    created = models.DateTimeField(auto_now_add=True)

    def calculate_hash(self):
        return f'{self.ap.geojson.x},{self.ap.geojson.y},{self.ap.max_radius}'

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
