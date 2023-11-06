# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.test import Client


class ISPTAuthBackendTestCase(TestCase):
    def setUp(self) -> None:
        return super().setUp()

    def test_backend_auth(self):
        """
        Check that we cannot login with None as the password
        """
        self.test_user1 = get_user_model().objects.create_user(
            email='testuser1@fb.com', password='12345',
            first_name="test", last_name="test"
        )
        self.user_client1 = Client(user=self.test_user1)
        login = self.user_client1.login(
            email='testuser1@fb.com')
        self.assertFalse(login)
