# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.urls import reverse
from rest_framework.status import (
    HTTP_200_OK,
    HTTP_201_CREATED,
    HTTP_204_NO_CONTENT,
    HTTP_401_UNAUTHORIZED,
    HTTP_404_NOT_FOUND,
    HTTP_400_BAD_REQUEST,
)
from rest_framework.test import APIClient
from workspace.api.models import DummyTaskModel

from workspace.tests.test_geomodels import WorkspaceBaseAPITestCase, JSON_CONTENT_TYPE

from unittest import mock

import uuid

DUMMY_TASK_CREATE_API_ENDPOINT = "workspace:api:dummy-task-create"
DUMMY_TASK_STOP_API_ENDPOINT = "workspace:api:dummy-task-stop"
DUMMY_TASK_RETRIEVE_DELETE_API_ENDPOINT = "workspace:api:dummy-task-retrieve-delete"

DUMMY_TASK_ID = "abcd123"
NUMBER_OF_SECTORS = 123
SLEEP_RESPONSE = "Hello World"


class TaskAPIFrameworkTestCase(WorkspaceBaseAPITestCase):
    def setUp(self):
        super(TaskAPIFrameworkTestCase, self).setUp()

        self.task_model = DummyTaskModel(
            task_id=DUMMY_TASK_ID,
            ap=self.test_ap,
            sleep_length=1,
            number_of_sectors=NUMBER_OF_SECTORS,
            sleep_response=SLEEP_RESPONSE,
            owner=self.testuser,
        )
        self.task_model.save()

    def assert_bad_create_dummy_task_request(self, data):
        response = self.client.post(
            reverse(DUMMY_TASK_CREATE_API_ENDPOINT),
            data,
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )

        self.assertEqual(response.status_code, HTTP_400_BAD_REQUEST)

    @mock.patch("workspace.api.models.task_models.app")
    def test_create_task(self, app_mock):
        response = self.client.post(
            reverse(DUMMY_TASK_CREATE_API_ENDPOINT),
            {"ap": str(self.test_ap.uuid), "sleep_length": 1},
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )

        self.assertEqual(response.status_code, HTTP_201_CREATED)
        self.assertIn("uuid", response.json())

        task_model_id = response.json()["uuid"]

        # Check that task was sent in celery
        app_mock.send_task.assert_called_once_with(
            DummyTaskModel.task_name, (uuid.UUID(task_model_id),)
        )

    def test_get_task(self):
        response = self.client.get(
            reverse(
                DUMMY_TASK_RETRIEVE_DELETE_API_ENDPOINT,
                kwargs={"uuid": self.task_model.uuid},
            )
        )

        self.assertEqual(response.status_code, HTTP_200_OK)
        response_dict = response.json()
        self.assertIn("uuid", response_dict)
        self.assertIn("status", response_dict)
        self.assertIn("number_of_sectors", response_dict)
        self.assertIn("sleep_response", response_dict)

        self.assertEquals(response_dict["uuid"], str(self.task_model.uuid))
        self.assertEquals(response_dict["number_of_sectors"], NUMBER_OF_SECTORS)
        self.assertEquals(response_dict["sleep_response"], SLEEP_RESPONSE)

    @mock.patch("workspace.models.task_models.app")
    def test_delete_task(self, app_mock):
        response = self.client.delete(
            reverse(
                DUMMY_TASK_RETRIEVE_DELETE_API_ENDPOINT,
                kwargs={"uuid": self.task_model.uuid},
            )
        )

        self.assertEqual(response.status_code, HTTP_204_NO_CONTENT)
        self.assertRaises(
            DummyTaskModel.DoesNotExist,
            DummyTaskModel.objects.get,
            owner=self.testuser,
            uuid=self.task_model.uuid,
        )

        # Check that task was revoked in celery
        app_mock.control.revoke.assert_called_once_with(DUMMY_TASK_ID, terminate=True)

    @mock.patch("workspace.models.task_models.app")
    def test_stop_task(self, app_mock):
        response = self.client.get(
            reverse(
                DUMMY_TASK_STOP_API_ENDPOINT,
                kwargs={"uuid": self.task_model.uuid},
            )
        )

        self.assertEqual(response.status_code, HTTP_200_OK)
        self.assertEqual(response.json()["uuid"], str(self.task_model.uuid))

        # Check if still in DB
        self.assertEqual(
            len(
                DummyTaskModel.objects.filter(
                    owner=self.testuser, uuid=self.task_model.uuid
                )
            ),
            1,
        )

        # Check that task was revoked in celery
        app_mock.control.revoke.assert_called_once_with(DUMMY_TASK_ID, terminate=True)

    def test_get_nonexistent_ap(self):
        response = self.client.get(
            reverse(
                DUMMY_TASK_RETRIEVE_DELETE_API_ENDPOINT,
                kwargs={"uuid": str(uuid.uuid4())},
            )
        )

        self.assertEqual(response.status_code, HTTP_404_NOT_FOUND)

    def test_ap_user_validation(self):
        self.assert_bad_create_dummy_task_request(
            {"ap": str(self.test_ap_other_user.uuid), "sleep_length": 1}
        )

    def test_input_validation(self):
        self.assert_bad_create_dummy_task_request({})

    def test_no_auth(self):
        client = APIClient()
        response = client.post(
            reverse(DUMMY_TASK_CREATE_API_ENDPOINT),
            {},
            format="json",
            HTTP_ACCEPT=JSON_CONTENT_TYPE,
        )

        self.assertEqual(response.status_code, HTTP_401_UNAUTHORIZED)

        response = client.get(
            reverse(
                DUMMY_TASK_RETRIEVE_DELETE_API_ENDPOINT,
                kwargs={"uuid": str(uuid.uuid4())},
            )
        )

        self.assertEqual(response.status_code, HTTP_401_UNAUTHORIZED)

        response = client.delete(
            reverse(
                DUMMY_TASK_RETRIEVE_DELETE_API_ENDPOINT,
                kwargs={"uuid": str(uuid.uuid4())},
            )
        )

        self.assertEqual(response.status_code, HTTP_401_UNAUTHORIZED)

        response = client.get(
            reverse(
                DUMMY_TASK_STOP_API_ENDPOINT,
                kwargs={"uuid": str(uuid.uuid4())},
            )
        )

        self.assertEqual(response.status_code, HTTP_401_UNAUTHORIZED)
