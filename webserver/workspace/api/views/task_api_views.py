from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import generics, mixins
from rest_framework.status import HTTP_201_CREATED
from rest_framework.schemas.openapi import AutoSchema

from workspace.api.models import (
    AsyncTaskAPIModel,
    AsyncTaskAPIModelCreateSuccessSerializer,
    AsyncTaskAPIModelResultsSerializer,
    AsyncTaskAPIModel,
)

import json


class TaskAPISchema(AutoSchema):
    def get_response_serializer(self, *args, **kwargs):
        return AsyncTaskAPIModelCreateSuccessSerializer(*args, **kwargs)


class BaseTaskAPICreateView(generics.GenericAPIView):
    permission_classes = [AllowAny]  # Change to token only
    schema = None

    task_type = ""  # Please change to nonblank

    input_validation = False  # Configuration option for input validation

    def get_input(self, request):
        # Input validation
        if self.input_validation:
            validator = self.get_serializer_class()(data=request.data)
            validator.is_valid(raise_exception=True)
            return validator.data
        elif request.data:
            return json.loads(request.data)
        else:
            return None

    def post(self, request, *args, **kwargs):
        task = AsyncTaskAPIModel.create_task(
            request.user, self.task_type, self.get_input(request)
        )
        return Response(
            status=HTTP_201_CREATED,
            data=AsyncTaskAPIModelCreateSuccessSerializer(instance=task).data,
        )


class TaskAPIRetrieveView(mixins.RetrieveModelMixin, generics.GenericAPIView):
    lookup_field = "uuid"
    permission_classes = [AllowAny]  # Change to token only
    serializer_class = AsyncTaskAPIModelResultsSerializer
    schema = AutoSchema(tags=["Task API"])

    def get_queryset(self):
        import logging

        for m in AsyncTaskAPIModel.objects.filter(owner=self.request.user):
            logging.info(AsyncTaskAPIModelResultsSerializer(instance=m).data)
        return AsyncTaskAPIModel.objects.filter(owner=self.request.user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)
