from django.urls import reverse
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND,
    HTTP_400_BAD_REQUEST,
)
from rest_framework.test import APIClient
from workspace.api.models import AsyncTaskAPIModel
from workspace.models.task_models import AsyncTaskStatus

from workspace.tests.test_geomodels import WorkspaceBaseAPITestCase, JSON_CONTENT_TYPE

import celery.states
import uuid

DUMMY_TASK_API_ENDPOINT = "workspace:api:dummy-task"
TASK_INFO_API_ENDPOINT = "workspace:api:task-api-info"


class TaskAPIFrameworkTestCase(WorkspaceBaseAPITestCase):
    def setUp(self):
        super(TaskAPIFrameworkTestCase, self).setUp()

    def make_dummy_api_sleep_request(self, data):
        response = self.client.post(
            reverse(DUMMY_TASK_API_ENDPOINT),
            data,
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )

        self.assertEqual(response.status_code, HTTP_201_CREATED)
        self.assertIn("uuid", response.json())
        return response.json()["uuid"]

    def assert_bad_dummy_api_sleep_request(self, data):
        response = self.client.post(
            reverse(DUMMY_TASK_API_ENDPOINT),
            data,
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )

        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    def get_task_info(self, uuid):
        response = self.client.get(
            reverse(TASK_INFO_API_ENDPOINT, kwargs={"uuid": uuid})
        )

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertIn("uuid", response.json())
        self.assertIn("status", response.json())
        self.assertIn("result", response.json())
        return response.json()

    def assert_task_info_not_exists(self, uuid):
        response = self.client.get(
            reverse(TASK_INFO_API_ENDPOINT, kwargs={"uuid": uuid})
        )

        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)

    def test_create_task(self):
        task_id = self.make_dummy_api_sleep_request({"duration": 1})

        task_info = self.get_task_info(task_id)
        self.assertEqual(task_info["status"], AsyncTaskStatus.IN_PROGRESS.value)
        self.assertIsNone(task_info["result"])

        # Check that task is running in celery
        task = AsyncTaskAPIModel.objects.get(uuid=task_id)
        self.assertIn(
            task.task_result.status, [celery.states.PENDING, celery.states.STARTED]
        )

    def test_input_validation(self):
        self.assert_bad_dummy_api_sleep_request({})

    def test_get_nonexistent_task(self):
        self.assert_task_info_not_exists(str(uuid.uuid4()))

    def test_no_auth(self):
        client = APIClient()
        response = client.post(
            reverse(DUMMY_TASK_API_ENDPOINT),
            {},
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )

        self.assertEqual(response.status_code, HTTP_401_UNAUTHORIZED)

        response = client.get(
            reverse(TASK_INFO_API_ENDPOINT, kwargs={"uuid": str(uuid.uuid4())})
        )

        self.assertEqual(response.status_code, HTTP_401_UNAUTHORIZED)
