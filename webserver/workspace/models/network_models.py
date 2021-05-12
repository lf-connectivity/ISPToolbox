from django.db import models
from django.conf import settings
import uuid
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point, GEOSGeometry
import json
from workspace.utils.geojson_circle import createGeoJSONCircle
from .model_constants import FeatureType
from mmwave.tasks.link_tasks import getDTMPoint
from mmwave.models import EPTLidarPointCloud
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
from django.dispatch import receiver
from django.db.models.signals import pre_save

BUFFER_DSM_EXPORT_KM = 0.5


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


class WorkspaceFeature(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    geojson = geo_models.PointField()
    uuid = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    @classmethod
    def get_features_for_user(cls, user, serializer=None):
        objects = cls.objects.filter(owner=user).all()
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

    class Meta:
        abstract = True


class AccessPointLocation(WorkspaceFeature):
    name = models.CharField(max_length=50)
    height = models.FloatField()
    max_radius = models.FloatField()
    no_check_radius = models.FloatField(default=0.01)
    default_cpe_height = models.FloatField(default=2)

    @property
    def max_radius_miles(self):
        return self.max_radius * 0.621371

    @property
    def height_ft(self):
        return self.height * 3.28084

    @property
    def default_cpe_height_ft(self):
        return self.default_cpe_height * 3.28084

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


class CPELocation(WorkspaceFeature):
    name = models.CharField(max_length=100)
    height = models.FloatField()

    def convert_to_dtm_height(self) -> float:
        point = self.geojson
        dtm = getDTMPoint(point)
        tile_engine = DSMTileEngine(point, EPTLidarPointCloud.query_intersect_aoi(point))
        dsm = tile_engine.getSurfaceHeight(point)
        return self.height + dsm - dtm

    @property
    def height_ft(self):
        return self.height * 3.28084

    @property
    def feature_type(self):
        return FeatureType.CPE.value

@receiver(pre_save, sender=CPELocation)
def modify_height(sender, instance, **kwargs):
    # we are creating the cpe for the first time
    if instance.created is None:
        instance.height = instance.convert_to_dtm_height()

class APToCPELink(WorkspaceFeature):
    frequency = models.FloatField(default=2.437)
    geojson = geo_models.LineStringField()
    ap = models.ForeignKey(AccessPointLocation, on_delete=models.CASCADE, editable=False)
    cpe = models.ForeignKey(CPELocation, on_delete=models.CASCADE, editable=False)

    @property
    def feature_type(self):
        return FeatureType.AP_CPE_LINK.value


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
