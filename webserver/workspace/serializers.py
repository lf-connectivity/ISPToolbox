from datetime import timezone
from rest_framework import serializers

from workspace import models


class RadioSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Radio
        fields = '__all__'


class PTPLinkSerializer(serializers.ModelSerializer):
    radios = RadioSerializer(many=True)

    class Meta:
        model = models.PTPLink
        fields = '__all__'


class NetworkSerializer(serializers.ModelSerializer):
    ptplinks = PTPLinkSerializer(many=True)

    class Meta:
        model = models.Network
        fields = ['name', 'uuid', 'created_date', 'owner', 'ptplinks', 'map_center', 'zoom_level']


class AccessPointSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    height_ft = serializers.FloatField(read_only=True)
    max_radius_miles = serializers.FloatField(read_only=True)
    feature_type = serializers.CharField(read_only=True)

    class Meta:
        model = models.AccessPointLocation
        exclude = ['created']


class CPESerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    height_ft = serializers.FloatField(read_only=True)
    feature_type = serializers.CharField(read_only=True)

    class Meta:
        model = models.CPELocation
        exclude = ['created']


class APToCPELinkSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    lookup_field = 'uuid'
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    feature_type = serializers.CharField(read_only=True)
    ap = serializers.PrimaryKeyRelatedField(
        queryset=models.AccessPointLocation.objects.all(),
        pk_field=serializers.UUIDField()
    )
    cpe = serializers.PrimaryKeyRelatedField(
        queryset=models.CPELocation.objects.all(),
        pk_field=serializers.UUIDField()
    )

    class Meta:
        model = models.APToCPELink
        exclude = ['created']


class NetworkMapPreferencesSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = models.NetworkMapPreferences
        fields = '__all__'
