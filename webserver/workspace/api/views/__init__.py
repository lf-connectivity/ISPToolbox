from .task_api_views import create_views_for_task_api_serializer
from .token_views import TokenInspectorView

# Put views here
from webserver.settings import PROD

if not PROD:
    from workspace.api.models.dummy_models import DummyTaskSerializer

    (
        DummyTaskCreateView,
        DummyTaskStopView,
        DummyTaskRetrieveDeleteView,
    ) = create_views_for_task_api_serializer(
        DummyTaskSerializer, "DummyTaskCreateView", "DummyTaskStopView", "DummyTaskRetrieveDeleteView", tags=['Dummy Task']
    )

import workspace.utils.import_utils

__all__ = workspace.utils.import_utils.get_imported_classnames(__name__)
