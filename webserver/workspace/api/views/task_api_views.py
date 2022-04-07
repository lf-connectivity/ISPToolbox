from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, mixins
from rest_framework.status import HTTP_201_CREATED
from rest_framework.schemas.openapi import AutoSchema

from workspace.mixins import WorkspaceFeatureGetQuerySetMixin
from workspace.api.models.task_models import AsyncTaskAPIGenericResponseSerializer


class TaskAPIGenericResponseSchema(AutoSchema):
    def get_response_serializer(self, *args, **kwargs):
        return AsyncTaskAPIGenericResponseSerializer(*args, **kwargs)


def create_views_for_task_api_serializer(
    serializer_cls,
    create_view_name,
    stop_view_name,
    retrieve_delete_view_name,
    tags=None,
):
    class TaskAPICreateView(mixins.CreateModelMixin, generics.GenericAPIView):
        permission_classes = [IsAuthenticated]
        schema = TaskAPIGenericResponseSchema(tags=tags)
        serializer_class = serializer_cls.get_create_request_serializer_class()

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
            self.create(request, *args, **kwargs)
            return Response(
                {"uuid": self.task_id},
                status=HTTP_201_CREATED,
            )

    class TaskAPIStopView(
        WorkspaceFeatureGetQuerySetMixin,
        mixins.RetrieveModelMixin,
        generics.GenericAPIView,
    ):
        lookup_field = "uuid"
        permission_classes = [IsAuthenticated]
        schema = TaskAPIGenericResponseSchema(tags=tags)
        serializer_class = serializer_cls

        def get(self, request, *args, **kwargs):
            instance = self.get_object()
            instance.cancel_task()
            return Response({"uuid": instance.uuid})

    class TaskAPIRetrieveDeleteView(
        WorkspaceFeatureGetQuerySetMixin,
        mixins.DestroyModelMixin,
        mixins.RetrieveModelMixin,
        generics.GenericAPIView,
    ):
        lookup_field = "uuid"
        permission_classes = [IsAuthenticated]
        schema = AutoSchema(tags=tags)
        serializer_class = serializer_cls.get_retrieve_delete_request_serializer_class()

        def perform_destroy(self, instance):
            instance.cancel_task()
            instance.delete()

        def get(self, request, *args, **kwargs):
            return self.retrieve(request, *args, **kwargs)

        def delete(self, request, *args, **kwargs):
            return self.destroy(request, *args, **kwargs)

    TaskAPICreateView.__name__ = create_view_name
    TaskAPIStopView.__name__ = stop_view_name
    TaskAPIRetrieveDeleteView.__name__ = retrieve_delete_view_name
    return (TaskAPICreateView, TaskAPIStopView, TaskAPIRetrieveDeleteView)
