from django.db import models
from django.conf import settings
from rest_framework import serializers
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point, GeometryCollection, GEOSGeometry
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import getMicrosoftBuildings
from IspToolboxApp.Helpers.kmz_helpers import (
    convertKml, createWorkspaceSessionGeoJsonFromAirLinkKML, createWorkspaceSessionGeoJsonFromAirLinkKMZ
)
from workspace.models.model_constants import FeatureType
import uuid
import json
from IspToolboxApp.util.s3 import writeS3Object, createPresignedUrl
from .network_models import (
    AccessPointSerializer, CPESerializer, APToCPELinkSerializer,
    CoverageAreaSerializer
)
from workspace import geojson_utils
from .network_models import (
    AccessPointLocation, APToCPELink
)
from rest_framework.validators import UniqueTogetherValidator
from django.utils.translation import gettext as _
from django.contrib.sessions.models import Session
from django.core.validators import MaxValueValidator, MinValueValidator


class WorkspaceMapSession(models.Model):
    """
    This model represents a workspace map session
    """
    name = models.CharField(max_length=63, default="untitled workspace")
    uuid = models.UUIDField(
        default=uuid.uuid4, primary_key=True, editable=False)

    owner = models.ForeignKey(settings.AUTH_USER_MODEL,
                              on_delete=models.CASCADE, null=True)
    session = models.ForeignKey(
        Session, on_delete=models.SET_NULL, blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59789))
    zoom = models.FloatField(default=3.75, validators=[
                             MinValueValidator(0), MaxValueValidator(20)])
    lock_dragging = models.BooleanField(default=False)

    fks_serializers = [AccessPointSerializer, CPESerializer,
                       APToCPELinkSerializer, CoverageAreaSerializer]
    UNIQUE_TOGETHER_ERROR = _(
        "You already have a session with that name, please write a different name.")

    class UnitPreferences(models.TextChoices):
        METRIC = "METRIC"
        IMPERIAL = "IMPERIAL"

    units = models.CharField(
        default=UnitPreferences.IMPERIAL,
        max_length=20,
        choices=UnitPreferences.choices,
    )

    @property
    def units_old(self):
        """
        This property is to support JS files that use US, METRIC - TODO update JS to use metric/imperial
        """
        if self.units == self.UnitPreferences.IMPERIAL:
            return 'US'
        else:
            return 'METRIC'

    # Logging
    logging_fbid = models.BigIntegerField(
        null=True, default=None, help_text="fbid for logging purposes, don't trust")

    class Meta:
        unique_together = [["owner", "name"]]

    @property
    def number_of_towers(self):
        return AccessPointLocation.objects.filter(map_session=self).count()

    @classmethod
    def get_rest_queryset(cls, request):
        user = None
        if request.user.is_authenticated:
            user = request.user
        return (cls.objects.filter(owner=user) | cls.objects.filter(session=request.session))

    def get_session_geojson(self):
        fcs = [serializer.get_features_for_session(
            self) for serializer in self.fks_serializers]
        return geojson_utils.merge_feature_collections(*fcs)

    @classmethod
    def get_or_create_demo_view(cls, request):
        request.session.save()
        session, created = cls.objects.get_or_create(
            session=Session.objects.get(pk=request.session.session_key)
        )

        if created:
            session.logging_fbid = int(request.GET.get('id', 0))
            lat = request.GET.get('lat', None)
            lon = request.GET.get('lon', None)
            if lat is not None and lon is not None:
                session.center = Point(x=float(lon), y=float(lat))
                session.zoom = 14
            session.save()
        else:
            # Disassociate session with current map session
            session.session = None
            session.save()

            # Clone current map session
            session.uuid = None
            session.save()

            # Associate session key with cloned map session
            session.session = Session.objects.get(
                pk=request.session.session_key)
            session.save()

        return session, created

    @classmethod
    def ws_allowed_session(cls, uuid, user, session):
        if user.is_anonymous:
            return cls.objects.filter(uuid=uuid, session=session.session_key).exists()
        else:
            return cls.objects.filter(uuid=uuid, owner=user).exists()

    def duplicate(self, new_name=None):
        """
        Duplicates the session and all foreign keys
        """
        kwargs = {}
        for field in self._meta.fields:
            kwargs[field.name] = getattr(self, field.name)

        kwargs.pop('uuid')
        if new_name is not None:
            kwargs.update(
                {'name': new_name}
            )
        new_instance = self.__class__(**kwargs)
        new_instance.save()
        # now you have id for the new instance so you can
        # create related models in similar fashion
        old_feature_map = {}
        for ap in self.accesspointlocation_set.all():
            old_uuid = ap.uuid
            ap.uuid = None
            ap.map_session = new_instance
            ap.save()
            old_feature_map.update({old_uuid: ap})

        for cpe in self.cpelocation_set.all():
            old_uuid = cpe.uuid
            cpe.uuid = None
            cpe.map_session = new_instance
            cpe.save()
            old_feature_map.update({old_uuid: cpe})

        for link in self.aptocpelink_set.all():
            new_link = APToCPELink(
                owner=self.owner, map_session=new_instance, ap=old_feature_map[link.ap.uuid],
                cpe=old_feature_map[link.cpe.uuid]
            )
            new_link.save()

        return new_instance

    def kml_key(self):
        return f'kml/ISPTOOLBOX_{self.name}_{self.uuid}.kml'

    @classmethod
    def importKMZ(cls, request):
        file = request.FILES.get('file', None)
        feats = []
        if file.name.endswith('.kmz'):
            feats = createWorkspaceSessionGeoJsonFromAirLinkKMZ(file)
        elif file.name.endswith('.kml'):
            feats = createWorkspaceSessionGeoJsonFromAirLinkKML(file)
        session = WorkspaceMapSession(name=request.POST.get(
            'name', None), owner=request.user)
        session.save()
        try:
            ap_dict = {}
            for f in feats:
                f_str = json.dumps({key: f[key]
                                   for key in ['type', 'coordinates']})
                if f.get('type', None) == 'Polygon':
                    CoverageAreaSerializer.Meta.model(
                        owner=request.user, map_session=session, geojson=GEOSGeometry(f_str)).save()
                elif f.get('type', None) == 'Point':
                    if f.get('properties', {}).get('type', None) == FeatureType.AP:
                        ap = AccessPointSerializer.Meta.model(
                            owner=request.user, map_session=session,
                            geojson=GEOSGeometry(f_str),
                            height=f.get('properties', {}).get('height', 0))
                        ap.save()
                        ap_dict.update({
                            f.get('properties', {}).get('id', None): ap
                        })
                    elif f.get('properties', {}).get('type', None) == FeatureType.CPE:
                        cpe = CPESerializer.Meta.model(
                            owner=request.user, map_session=session,
                            geojson=GEOSGeometry(f_str),
                            height=f.get('properties', {}).get('height', 0))
                        cpe.save()
                        ap_uuid = ap_dict.get(
                            f.get('properties', {}).get('ap', None), None)
                        APToCPELinkSerializer.Meta.model(
                            owner=request.user, map_session=session,
                            ap=ap_uuid, cpe=cpe
                        ).save()
        except Exception as e:
            session.delete()
            raise e
        return session

    def exportKMZ(self, export_format):
        geo_list = []
        gc = []
        coverage_areas = {'layer': 'coverage areas', 'geometries': []}
        for coverage_area in self.coveragearea_set.all():
            coverage = json.loads(coverage_area.geojson.json)
            gc.append(coverage_area.geojson)
            coverage_areas['geometries'].append(coverage)

        geo_list.append(coverage_areas)

        towers = {'layer': 'towers', 'geometries': []}
        for ap in self.accesspointlocation_set.all():
            ap_coverage = ap.getDSMExtentRequired()
            gc.append(ap_coverage)
            towers['geometries'].append(json.loads(ap_coverage.json))

        buildings = {'layer': 'buildings', 'geometries': None}
        buildings['geometries'] = getMicrosoftBuildings(
            GeometryCollection(gc).json, None
        )['buildings']['geometries']

        if export_format.cleaned_data['buildings']:
            geo_list.append(buildings)
        if export_format.cleaned_data['drawn_area']:
            geo_list.append(towers)

        kml = convertKml(geo_list)
        writeS3Object(self.kml_key(), kml)
        url = createPresignedUrl(self.kml_key())
        return url


class WorkspaceMapSessionSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    created = serializers.DateTimeField(format="%D %I:%M %p", read_only=True)
    last_updated = serializers.DateTimeField(format="%D", read_only=True)

    number_of_towers = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkspaceMapSession
        exclude = ['session', 'logging_fbid']
        validators = [
            UniqueTogetherValidator(
                queryset=WorkspaceMapSession.objects.all(),
                fields=["owner", "name"],
                message=WorkspaceMapSession.UNIQUE_TOGETHER_ERROR
            )
        ]


class NetworkMapPreferences(models.Model):
    """
    This model stores the user's last location during a map session
    """
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59788913307022))
    zoom = models.FloatField(default=3.75, validators=[
                             MinValueValidator(0), MaxValueValidator(20)])

    # Datetime Fields
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)


class NetworkMapPreferencesSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = NetworkMapPreferences
        fields = '__all__'
