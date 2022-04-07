from functools import partial
from rest_framework import serializers

from celery_async import celery_app as app
from workspace.models.task_models import (
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskUserMixin,
    AbstractAsyncTaskPrimaryKeyMixin,
    AsyncTaskStatus,
)


class AbstractAsyncTaskAPIModel(
    AbstractAsyncTaskAssociatedModel,
    AbstractAsyncTaskUserMixin,
    AbstractAsyncTaskPrimaryKeyMixin,
):
    task_name = None  # Extend it somewhere

    @classmethod
    def get_rest_queryset(cls, request):
        return cls.objects.filter(owner=request.user)

    @property
    def status(self):
        task_result = self.task_result
        if not task_result:
            return AsyncTaskStatus.ERROR.value
        else:
            return AsyncTaskStatus.from_celery_task_status(task_result.status).value

    def start_task(self):
        app.send_task(self.task_name, (self.uuid,))

    class Meta:
        abstract = True


class UserAllowedToAccessWorkspaceFeature:
    """
    Serializer validator for verifying that the user has access to a given Workspace feature
    """

    requires_context = True

    def __call__(self, workspace_feature, serializer):
        user = serializer.context["request"].user
        if workspace_feature.owner != user:

            # Return the exact same message as a does not exist for no-pk
            raise serializers.ValidationError(
                f'Invalid pk "{workspace_feature.pk}" - object does not exist.'
            )


class AbstractAsyncTaskAPISerializer(serializers.ModelSerializer):
    uuid = serializers.UUIDField(read_only=True)
    status = serializers.CharField(read_only=True)
    # Sub-serializer creation methods for different views

    @classmethod
    def get_create_request_serializer_class(cls):
        class AsyncTaskAPICreateSerializer(cls):
            class Meta:
                model = cls.Meta.model
                fields = cls.Meta.input_fields

        AsyncTaskAPICreateSerializer.__name__ = (
            cls.__name__.split("Serializer")[0] + "CreateRequestSerializer"
        )
        return AsyncTaskAPICreateSerializer

    @classmethod
    def get_retrieve_delete_request_serializer_class(cls):
        class AsyncTaskAPIRetrieveDeleteSerializer(cls):
            class Meta:
                model = cls.Meta.model
                fields = cls.Meta.output_fields + ["uuid", "status"]

        AsyncTaskAPIRetrieveDeleteSerializer.__name__ = (
            cls.__name__.split("Serializer")[0] + "RetrieveDeleteResponseSerializer"
        )
        return AsyncTaskAPIRetrieveDeleteSerializer

    class Meta:
        abstract = True
        fields = ["uuid", "status"]


class AsyncTaskAPIGenericResponseSerializer(serializers.Serializer):
    uuid = serializers.UUIDField(read_only=True)

    class Meta:
        fields = ["uuid"]
