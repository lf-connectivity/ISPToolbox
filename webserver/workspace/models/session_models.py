# (c) Meta Platforms, Inc. and affiliates. Copyright
import shlex
import subprocess
from django.db import models
from django.conf import settings
from rest_framework import serializers
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point, GeometryCollection, GEOSGeometry
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import getMicrosoftBuildings
from IspToolboxApp.Helpers.kmz_helpers import convertKml
from workspace.models.model_constants import FeatureType
import uuid
import json
import tempfile
import logging
from IspToolboxApp.util.s3 import writeS3Object, createPresignedUrl
from workspace.utils.import_session import (
    convert_file_to_workspace_session,
    flatten_geometry,
)
from .network_models import (
    AccessPointSerializer,
    CPESerializer,
    APToCPELinkSerializer,
    CoverageArea,
    CoverageAreaSerializer,
    PointToPointLinkSerializer,
    AccessPointSectorSerializer,
)
from workspace import geojson_utils
from .network_models import AccessPointLocation, APToCPELink, AccessPointSector
from rest_framework.validators import UniqueTogetherValidator
from django.utils.translation import gettext as _
from django.contrib.sessions.models import Session
from django.core.validators import MaxValueValidator, MinValueValidator


class WorkspaceMapSession(models.Model):
    """
    This model represents a workspace map session
    """

    name = models.CharField(max_length=63, default="untitled workspace")
    uuid = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True
    )
    session = models.ForeignKey(
        Session, on_delete=models.SET_NULL, blank=True, null=True
    )

    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59789))
    zoom = models.FloatField(
        default=3.75, validators=[MinValueValidator(0), MaxValueValidator(20)]
    )
    lock_dragging = models.BooleanField(default=False)

    fks_serializers = [
        AccessPointSerializer,
        CPESerializer,
        AccessPointSectorSerializer,
        APToCPELinkSerializer,
        CoverageAreaSerializer,
        PointToPointLinkSerializer,
    ]
    UNIQUE_TOGETHER_ERROR = _(
        "You already have a session with that name, please write a different name."
    )

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
            return "US"
        else:
            return "METRIC"

    # Logging
    logging_fbid = models.BigIntegerField(
        null=True, default=None, help_text="fbid for logging purposes, don't trust"
    )

    # Area numbering
    area_number = models.IntegerField(default=1)

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
        return cls.objects.filter(owner=user) | cls.objects.filter(
            session=request.session
        )

    def get_sidebar_info(self):
        aps = (
            AccessPointLocation.objects.filter(map_session=self)
            .order_by("-created")
            .all()
        )
        areas = CoverageArea.objects.filter(map_session=self).order_by("-created").all()
        sidebar_layers = {
            "aps": [],
            "areas": [CoverageAreaSerializer(area).data for area in areas],
        }
        for ap in aps:
            sectors = AccessPointSector.objects.filter(ap=ap).all()
            sidebar_layers["aps"].append(
                {
                    "ap": AccessPointSerializer(ap).data,
                    "sectors": [
                        AccessPointSectorSerializer(sector).data for sector in sectors
                    ],
                }
            )
        sidebar_layers.update(
            {
                "empty": len(sidebar_layers["aps"]) == 0
                and len(sidebar_layers["areas"]) == 0
            }
        )
        return sidebar_layers

    def get_session_geojson(self):
        fcs = [
            serializer.get_features_for_session(self)
            for serializer in self.fks_serializers
        ]
        return geojson_utils.merge_feature_collections(*fcs)

    @classmethod
    def __create_ogr_command(cls, input_file, output_file):
        return shlex.split(f'ogr2ogr -skipfailures {output_file} {input_file} -lco RFC7946=YES -nln isptoolbox')

    def get_session_kml(self):
        # Get the session as geojson
        geojson = self.get_session_geojson()

        # Write to Tempfile
        with tempfile.NamedTemporaryFile(
            "w", prefix=self.uuid.hex, suffix=".geojson"
        ) as tmp_file_geojson:
            tmp_file_geojson.write(
                json.dumps(
                    geojson,
                    default=lambda x: x.hex if isinstance(x, uuid.UUID) else None,
                )
            )
            tmp_file_geojson.flush()

            # Create KML file using ogr2ogr
            with tempfile.NamedTemporaryFile(
                "w", prefix=self.uuid.hex, suffix=".kml"
            ) as tmp_file:
                try:
                    cmd = WorkspaceMapSession.__create_ogr_command(tmp_file_geojson.name, tmp_file.name)
                    subprocess.check_output(cmd, encoding="UTF-8", stderr=subprocess.STDOUT)
                    with open(tmp_file.name, "r") as kml_output:
                        return kml_output.read()
                except Exception:
                    logging.exception("failed to convert session to KML")
                    return ""

    @classmethod
    def get_or_create_demo_view(cls, request):
        if request.user.is_anonymous:
            request.session.save()
            session, created = cls.objects.get_or_create(
                session_id=request.session.session_key
            )
        else:
            created = False
            try:
                session = cls.objects.filter(owner=request.user).latest("last_updated")
            except cls.DoesNotExist:
                created = True
                session = cls.objects.create(owner=request.user)

        if created:
            session.logging_fbid = int(request.GET.get("id", 0))
            lat = request.GET.get("lat", None)
            lon = request.GET.get("lon", None)
            if lat is not None and lon is not None:
                session.center = Point(x=float(lon), y=float(lat))
                session.zoom = 14
            session.save()
        else:
            if request.user.is_anonymous:
                # Disassociate session with current map session
                session.session = None
                session.save()

                # Clone current map session
                session.uuid = None
                session.save()

                # Associate session key with cloned map session
                session.session = Session.objects.get(pk=request.session.session_key)
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

        kwargs.pop("uuid")
        if new_name is not None:
            kwargs.update({"name": new_name})
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

        for sector in self.accesspointsector_set.all():
            old_uuid = sector.uuid
            sector.uuid = None
            sector.map_session = new_instance
            sector.save()
            old_feature_map.update({old_uuid: sector})

        for cpe in self.cpelocation_set.all():
            old_uuid = cpe.uuid
            cpe.uuid = None
            cpe.map_session = new_instance
            cpe.save()
            old_feature_map.update({old_uuid: cpe})

        for link in self.pointtopointlink_set.all():
            link.uuid = None
            link.map_session = new_instance
            link.save()

        # TODO: Get rid of if statement once sectors launch
        for link in self.aptocpelink_set.all():
            if link.ap:
                new_link = APToCPELink(
                    owner=self.owner,
                    map_session=new_instance,
                    ap=old_feature_map[link.ap.uuid],
                    cpe=old_feature_map[link.cpe.uuid],
                )
            else:
                new_link = APToCPELink(
                    owner=self.owner,
                    map_session=new_instance,
                    sector=old_feature_map[link.sector.uuid],
                    cpe=old_feature_map[link.cpe.uuid],
                )
            new_link.save()

        return new_instance

    def kml_key(self):
        return f"kml/ISPTOOLBOX_{self.name}_{self.uuid}.kml"

    @classmethod
    def getFeatureType(cls, feat, idx, feats, airlink):
        """
        Check if CPE or AP based on airlink's syntax
        """
        if airlink:
            # This is a link.ui.com file:
            # decode point features based on observed pattern (this is a best effort)
            if feat.get("properties", {}).get("description", None) is not None:
                # Check if any features after this one
                if idx + 1 >= len(feats):
                    # There are no terrain profiles after this feature -> this must be an AP
                    return FeatureType.AP
                else:
                    # Airlink CPE's are *usually* followed by a terrain profile
                    next_feat = feats[idx + 1]
                    if "Terrain" in next_feat.get("properties", {}).get("Name", ""):
                        return FeatureType.CPE
                    else:
                        # Default to adding an AP
                        return FeatureType.AP
        else:
            # This is not an airlink file -> we can try using ISP toolbox's encoding
            geom = feat.get("geometry", {})
            if geom.get("properties", {}).get("type", None) == FeatureType.CPE:
                return FeatureType.CPE
            else:
                # Default to adding an AP
                return FeatureType.AP

    @classmethod
    def importFile(cls, request):
        file = request.FILES.get("file", None)
        fc, airlink = convert_file_to_workspace_session(file)
        session = WorkspaceMapSession(
            name=request.POST.get("name", None), owner=request.user
        )
        session.save()
        try:
            ap_dict = {}
            last_ap = None
            feats = fc.get("features", [])
            for idx, f in enumerate(feats):
                geom = f.get("geometry", {})
                f_str = json.dumps({key: geom[key] for key in ["type", "coordinates"]})
                geos_geom = GEOSGeometry(f_str)
                hgt = None
                if geos_geom.hasz:
                    geos_geom, hgt = flatten_geometry(geos_geom)
                if geos_geom.geom_type == "Polygon":
                    CoverageAreaSerializer.Meta.model(
                        owner=request.user, map_session=session, geojson=geos_geom
                    ).save()
                elif geos_geom.geom_type == "Point":
                    feat_type = cls.getFeatureType(f, idx, feats, airlink)
                    if feat_type == FeatureType.CPE:
                        cpe = CPESerializer.Meta.model(
                            owner=request.user,
                            map_session=session,
                            geojson=geos_geom,
                            height=geom.get("properties", {}).get(
                                "height", hgt if hgt else 0
                            ),
                        )
                        cpe.save()
                        ap_uuid = ap_dict.get(
                            geom.get("properties", {}).get("ap", None), last_ap
                        )
                        APToCPELinkSerializer.Meta.model(
                            owner=request.user, map_session=session, ap=ap_uuid, cpe=cpe
                        ).save()
                    elif feat_type == FeatureType.AP:
                        ap = AccessPointSerializer.Meta.model(
                            owner=request.user,
                            map_session=session,
                            geojson=geos_geom,
                            height=geom.get("properties", {}).get("height", 0),
                        )
                        ap.save()
                        last_ap = ap
                        ap_dict.update({geom.get("properties", {}).get("id", None): ap})
                elif geos_geom.geom_type == "LineString":
                    ptp = PointToPointLinkSerializer.Meta.model(
                        owner=request.user,
                        map_session=session,
                        geojson=geos_geom,
                    )
                    ptp.save()
        except Exception as e:
            logging.exception('failed to import kmz file')
            session.delete()
            raise e
        return session

    def exportKMZ(self, export_format):
        geo_list = []
        gc = []
        coverage_areas = {"layer": "coverage areas", "geometries": []}
        for coverage_area in self.coveragearea_set.all():
            coverage = json.loads(coverage_area.geojson.json)
            gc.append(coverage_area.geojson)
            coverage_areas["geometries"].append(coverage)

        geo_list.append(coverage_areas)

        towers = {"layer": "towers", "geometries": []}
        for ap in self.accesspointlocation_set.all():
            ap_coverage = ap.getDSMExtentRequired()
            gc.append(ap_coverage)
            towers["geometries"].append(json.loads(ap_coverage.json))

        buildings = {"layer": "buildings", "geometries": None}
        buildings["geometries"] = getMicrosoftBuildings(
            GeometryCollection(gc).json, None
        )["buildings"]["geometries"]

        if export_format.cleaned_data["buildings"]:
            geo_list.append(buildings)
        if export_format.cleaned_data["drawn_area"]:
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
        exclude = ["session", "logging_fbid", "area_number"]
        validators = [
            UniqueTogetherValidator(
                queryset=WorkspaceMapSession.objects.all(),
                fields=["owner", "name"],
                message=WorkspaceMapSession.UNIQUE_TOGETHER_ERROR,
            )
        ]


class NetworkMapPreferences(models.Model):
    """
    This model stores the user's last location during a map session
    """

    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59788913307022))
    zoom = models.FloatField(
        default=3.75, validators=[MinValueValidator(0), MaxValueValidator(20)]
    )

    # Datetime Fields
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)


class NetworkMapPreferencesSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = NetworkMapPreferences
        fields = "__all__"
