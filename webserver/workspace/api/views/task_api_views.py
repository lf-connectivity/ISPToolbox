from rest_framework.permissions import IsAuthenticated
from rest_framework import generics, mixins
from rest_framework.schemas.openapi import AutoSchema

from workspace.mixins import WorkspaceFeatureGetQuerySetMixin
from workspace.api.models.task_models import AsyncTaskAPIGenericResponseSerializer


class TaskAPIGenericResponseSchema(AutoSchema):
    def get_response_serializer(self, *args, **kwargs):
        return AsyncTaskAPIGenericResponseSerializer(*args, **kwargs)


class TaskAPICreateView(mixins.CreateModelMixin, generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    tags = None
    serializer_class = None
    schema = TaskAPIGenericResponseSchema(tags=tags)

    def perform_create(self, serializer):
        task = serializer.save(owner=self.request.user)
        assert hasattr(
            task, "start_task"
        ), "'%s' should have a 'start_task' function to start the task" % (
            task.__class__.__name__
        )
        task.start_task()
        self.task_id = task.uuid

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class TaskAPIStopView(
    WorkspaceFeatureGetQuerySetMixin,
    mixins.RetrieveModelMixin,
    generics.GenericAPIView,
):
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]
    tags = None
    serializer_class = None
    schema = TaskAPIGenericResponseSchema(tags=tags)

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.cancel_task()
        return self.retrieve(request, *args, **kwargs)


class TaskAPIRetrieveDeleteView(
    WorkspaceFeatureGetQuerySetMixin,
    mixins.DestroyModelMixin,
    mixins.RetrieveModelMixin,
    generics.GenericAPIView,
):
    lookup_field = "uuid"
    permission_classes = [IsAuthenticated]
    tags = None
    serializer_class = None
    schema = TaskAPIGenericResponseSchema(tags=tags)

    def perform_destroy(self, instance):
        instance.cancel_task()
        instance.delete()

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)
