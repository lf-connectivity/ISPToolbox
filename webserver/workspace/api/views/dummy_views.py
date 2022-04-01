from django.http import Http404
from rest_framework import serializers

from webserver import settings
from workspace.api.views.task_api_views import TaskAPISchema, BaseTaskAPICreateView


# Testing code
class DummyAPITestInputValidator(serializers.Serializer):
    duration = serializers.IntegerField(min_value=1, max_value=10)


class DummyAPITestCreateView(BaseTaskAPICreateView):
    task_type = "workspace.api.tasks.dummy_tasks.apiSleep"
    input_validation = True
    serializer_class = DummyAPITestInputValidator

    if settings.PROD:
        schema = None
    else:
        schema = TaskAPISchema(tags=["Task API Framework Test"])

    def dispatch(self, request, *args, **kwargs):
        if settings.PROD:
            return Http404
        return super().dispatch(request, *args, **kwargs)
