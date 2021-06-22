from django.db import models
from django.conf import settings
from rest_framework import serializers
from django.contrib.gis.db import models as geo_models
from django.contrib.gis.geos import Point
from .validators import validate_zoom_level
import uuid
from .network_models import (
    AccessPointSerializer, CPESerializer, APToCPELinkSerializer, CoverageArea, CoverageAreaSerializer
)
from workspace import geojson_utils
from .network_models import (
    AccessPointLocation, CPELocation, APToCPELink
)
from rest_framework.validators import UniqueTogetherValidator
from django.utils.translation import gettext as _


class WorkspaceMapSession(models.Model):
    """
    This model represents a workspace map session
    """
    name = models.CharField(max_length=63, default="untitled workspace")
    uuid = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59789))
    zoom = models.FloatField(default=3.75, validators=[validate_zoom_level])

    duplicate_fks = [AccessPointLocation, CPELocation, APToCPELink]
    UNIQUE_TOGETHER_ERROR = _("You already have a session with that name, please select a different name.")

    class Meta:
        unique_together = [["owner", "name"]]

    @property
    def number_of_towers(self):
        return AccessPointLocation.objects.filter(session=self).count()

    def get_session_geojson(self, request):
        aps = AccessPointLocation.get_features_for_session(request.user, self, AccessPointSerializer)
        cpes = CPELocation.get_features_for_session(request.user, self, CPESerializer)
        links = APToCPELink.get_features_for_session(request.user, self, APToCPELinkSerializer)
        coverage_areas = CoverageArea.get_features_for_session(request.user, self, CoverageAreaSerializer)
        return geojson_utils.merge_feature_collections(aps, cpes, links, coverage_areas)

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
            ap.session = new_instance
            ap.save()
            old_feature_map.update({old_uuid: ap})

        for cpe in self.cpelocation_set.all():
            old_uuid = cpe.uuid
            cpe.uuid = None
            cpe.session = new_instance
            cpe.save()
            old_feature_map.update({old_uuid: cpe})

        for link in self.aptocpelink_set.all():
            new_link = APToCPELink(
                owner=self.owner, session=new_instance, ap=old_feature_map[link.ap.uuid],
                cpe=old_feature_map[link.cpe.uuid], geojson=link.geojson
            )
            new_link.save()

        return new_instance


class WorkspaceMapSessionSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    created = serializers.DateTimeField(format="%D %I:%M %p", read_only=True)
    last_updated = serializers.DateTimeField(format="%D", read_only=True)

    number_of_towers = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkspaceMapSession
        exclude = []
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
    owner = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Map Preferences
    center = geo_models.PointField(default=Point(-97.03125, 36.59788913307022))
    zoom = models.FloatField(default=3.75, validators=[validate_zoom_level])

    # Datetime Fields
    created = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)


class NetworkMapPreferencesSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = NetworkMapPreferences
        fields = '__all__'
