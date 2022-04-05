from workspace import models as workspace_models
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework import mixins
from workspace.mixins import (
    WorkspaceFeatureGetQuerySetMixin, WorkspaceAPIPerformCreateMixin
)
from rest_framework.schemas.openapi import AutoSchema
from rest_framework.permissions import IsAuthenticated


class PointToPointServiceabilityRetrieveView(
    WorkspaceFeatureGetQuerySetMixin,
    mixins.RetrieveModelMixin,
    generics.GenericAPIView):

    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]
    serializer_class = workspace_models.PointToPointLinkServiceableSerializer
    schema = AutoSchema(tags=['Point To Point'])
    
    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)


class PointToPointServiceabilityCreateView(
    WorkspaceAPIPerformCreateMixin,
    mixins.CreateModelMixin,
    generics.GenericAPIView
):
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]
    serializer_class = workspace_models.PointToPointLinkServiceableSerializer
    schema = AutoSchema(tags=['Point To Point'])

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)