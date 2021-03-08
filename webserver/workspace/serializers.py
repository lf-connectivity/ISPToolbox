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
        fields = ['name', 'uuid', 'created_date', 'owner', 'ptplinks']


class AccessPointSerializer(serializers.ModelSerializer):
    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    lookup_field = 'uuid'
    class Meta:
        model = models.AccessPointLocation
        fields = '__all__'
