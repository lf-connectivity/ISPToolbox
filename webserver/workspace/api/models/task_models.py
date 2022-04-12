from rest_framework import serializers
import logging
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
    task_name = None

    @classmethod
    def get_rest_queryset(cls, request):
        return cls.objects.filter(owner=request.user)

    @property
    def status(self):
        task_result = self.task_result
        if not task_result:
            return AsyncTaskStatus.UNKNOWN.value
        else:
            return AsyncTaskStatus.from_celery_task_status(task_result.status).value

    def start_task(self):
        assert (
            self.task_name is not None
        ), "Please specify the celery name of the task associated with this model under task_name"
        logging.info(f"starting task: {self.task_name}")
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


class AsyncTaskAPIGenericResponseSerializer(serializers.Serializer):
    uuid = serializers.UUIDField(read_only=True)

    class Meta:
        fields = ["uuid"]
