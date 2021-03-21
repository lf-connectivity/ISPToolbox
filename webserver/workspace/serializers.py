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
    created = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    last_updated = serializers.DateTimeField(format="%m/%d/%Y %-I:%M%p", required=False)
    height_ft = serializers.FloatField(read_only=True)
    max_radius_miles = serializers.FloatField(read_only=True)
    class Meta:
        model = models.AccessPointLocation
        fields = '__all__'
