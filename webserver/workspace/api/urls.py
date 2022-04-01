from django.urls import path
from django.views.generic import TemplateView
from rest_framework.schemas import get_schema_view
from webserver import settings
from workspace.api.views import TaskAPIRetrieveView, DummyAPITestCreateView, TokenInspectorView

app_name = "workspace.workspace_api"
urlpatterns = [
    path('token/', TokenInspectorView.as_view(), name='api-token'),
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
    path('v1/async-tasks/<uuid:uuid>/', TaskAPIRetrieveView.as_view(), name="task-api-info")
]


if not settings.PROD:
    urlpatterns += [
        path('v1/async-tasks/dummy/', DummyAPITestCreateView.as_view(), name="dummy-task")
    ]
