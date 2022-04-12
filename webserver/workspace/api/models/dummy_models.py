from django.db import models
from rest_framework import serializers
from workspace.models import AccessPointLocation
from workspace.api.models.task_models import (
    AbstractAsyncTaskAPIModel,
    UserAllowedToAccessWorkspaceFeature,
)


class DummyTaskModel(AbstractAsyncTaskAPIModel):
    task_name = "workspace.api.tasks.dummy_tasks.dummyTask"
    ap = models.ForeignKey(
        "workspace.AccessPointLocation", on_delete=models.CASCADE, null=False
    )
    sleep_length = models.PositiveIntegerField()

    number_of_sectors = models.PositiveIntegerField(null=True, blank=True, default=None)
    sleep_response = models.CharField(
        max_length=128, null=True, blank=True, default=None
    )


class DummyTaskSerializer(serializers.ModelSerializer):
    lookup_field = "uuid"
    uuid = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    ap = serializers.PrimaryKeyRelatedField(
        queryset=AccessPointLocation.objects.all(),
        validators=[UserAllowedToAccessWorkspaceFeature()],
    )
    sleep_length = serializers.IntegerField(required=True, min_value=1, max_value=100)

    class Meta:
        model = DummyTaskModel
        fields = [
            "task_id",
            "status",
            "ap",
            "uuid",
            "number_of_sectors",
            "sleep_response",
            "sleep_length",
        ]
