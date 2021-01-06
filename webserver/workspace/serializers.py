from rest_framework import serializers
from workspace.models import Network, PTPLink, Radio


class RadioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Radio
        fields = '__all__'


class PTPLinkSerializer(serializers.ModelSerializer):
    radios = RadioSerializer(many=True)

    class Meta:
        model = PTPLink
        fields = '__all__'


class NetworkSerializer(serializers.ModelSerializer):
    ptplinks = PTPLinkSerializer(many=True)

    class Meta:
        model = Network
        fields = ['name', 'uuid', 'created_date', 'owner', 'ptplinks']
