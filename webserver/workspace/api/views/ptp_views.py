from workspace.api import models as workspace_models
from .task_api_views import (
    TaskAPICreateView, TaskAPIRetrieveDeleteView, TaskAPIStopView
)
from rest_framework.schemas.openapi import AutoSchema


class PointToPointServiceabilityRetrieveDeleteView(
    TaskAPIRetrieveDeleteView
):
    serializer_class = workspace_models.PointToPointLinkServiceableSerializer
    tags = ['Point To Point']
    schema = AutoSchema(tags=tags)


class PointToPointServiceabilityCreateView(
    TaskAPICreateView
):
    serializer_class = workspace_models.PointToPointLinkServiceableSerializer
    tags = ['Point To Point']
    schema = AutoSchema(tags=tags)


class PointToPointServiceabilityStopView(
    TaskAPIStopView
):
    serializer_class = workspace_models.PointToPointLinkServiceableSerializer
    tags = ['Point To Point']
    schema = AutoSchema(tags=tags)
