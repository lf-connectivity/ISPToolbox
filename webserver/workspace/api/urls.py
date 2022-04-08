from django.urls import path
from django.views.generic import TemplateView
from rest_framework.schemas import get_schema_view
from webserver import settings
from workspace.api import views as api_views

app_name = "workspace.api"
urlpatterns = [
    path('token/', api_views.TokenInspectorView.as_view(), name='api-token'),
    path('docs/', TemplateView.as_view(
        template_name='swagger-ui.html',
        extra_context={'schema_url': 'workspace:api:openapi-schema'}
    ), name='swagger-ui'),
    path('openapi', get_schema_view(
        title="ISP Toolbox API",
        description="ISP Toolbox API to access lidar tools",
        version="1.0.0"
    ), name='openapi-schema'),

    # V1
    path(
        'v1/ptp-serviceability/<uuid:uuid>/',
        api_views.PointToPointServiceabilityRetrieveDeleteView.as_view(),
        name="ptp-serviceability-get"
    ),
    path(
        'v1/ptp-serviceability/',
        api_views.PointToPointServiceabilityCreateView.as_view(),
        name="ptp-serviceability-create"
    ),
    path(
        'v1/ptp-serviceability/',
        api_views.PointToPointServiceabilityStopView.as_view(),
        name="ptp-serviceability-stop"
    ),
    path('v1/dummy-task/', api_views.DummyTaskCreateView.as_view(), name="dummy-task-create"),
    path('v1/dummy-task/<uuid:uuid>/', api_views.DummyTaskRetrieveDeleteView.as_view(),
            name="dummy-task-retrieve-delete"),
    path('v1/dummy-task/<uuid:uuid>/stop/', api_views.DummyTaskStopView.as_view(), name="dummy-task-stop"),
]
