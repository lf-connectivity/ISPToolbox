
from workspace.api.models.dummy_models import DummyTaskSerializer
from .task_api_views import TaskAPICreateView, TaskAPIRetrieveDeleteView, TaskAPIStopView


class DummyTaskCreateView(TaskAPICreateView):
    tags = ['Dummy Task']
    serializer_class = DummyTaskSerializer.get_create_request_serializer_class()


class DummyTaskStopView(TaskAPIStopView):
    tags = ['Dummy Task']
    serializer_class = DummyTaskSerializer


class DummyTaskRetrieveDeleteView(TaskAPIRetrieveDeleteView):
    tags = ['Dummy Task']
    serializer_class = DummyTaskSerializer.get_retrieve_delete_request_serializer_class()
