# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.contrib.gis.geos.point import Point
from django.urls import reverse
from django.test import TestCase
from django.test import Client
from workspace.models import WorkspaceMapSession, AccessPointLocation
from django.contrib.auth import get_user_model


class TestCookieBasedSession(TestCase):
    """
    Test demo view that uses cookies instead of user accounts to create network data
    """

    def setUp(self) -> None:
        self.client = Client()
        return super().setUp()

    def test_create_network(self):
        """
        Create a test network without signing into isptoolbox
        """
        response = self.client.get('/demo/network-app/')
        self.assertTrue(response.status_code == 200)
        num_sessions = WorkspaceMapSession.objects.filter(
            session_id=self.client.session.session_key
        ).count()
        self.assertGreater(num_sessions, 0)


class TestPrivacyCookieBasedSession(TestCase):
    """
    Make sure that users and sessions can't read other users/sessions workspace information
    """

    def setUp(self) -> None:
        # Create First Test User
        self.test_user1 = get_user_model().objects.create_user(
            email='testuser1@fb.com', password='12345',
            first_name="test", last_name="test"
        )
        self.user_client1 = Client(user=self.test_user1)
        login = self.user_client1.login(
            email='testuser1@fb.com', password='12345')
        response = self.user_client1.get(
            reverse('workspace:edit_account_network'))
        self.network1 = WorkspaceMapSession.objects.filter(
            owner=self.test_user1).first()
        self.assertTrue(login)
        self.assertEqual(response.status_code, 302)
        # Create AP For First User
        self.ap1 = AccessPointLocation(
            map_session=self.network1, owner=self.test_user1,
            geojson=Point(0, 0), height=10, max_radius=3
        )
        self.ap1.save()

        # Create Second Test User
        self.test_user2 = get_user_model().objects.create_user(
            email='testuser2@fb.com', password='12345',
            first_name="test", last_name="test"
        )
        self.user_client2 = Client(user=self.test_user2)
        login = self.user_client2.login(
            email='testuser2@fb.com', password='12345')
        response = self.user_client2.get(
            reverse('workspace:edit_account_network'))
        self.network2 = WorkspaceMapSession.objects.filter(
            owner=self.test_user2).first()
        self.assertTrue(login)
        self.assertEqual(response.status_code, 302)

        # Create Cookie Based Session User
        self.cookie_client = Client()
        response = self.cookie_client.get('/demo/network-app/')
        self.assertEqual(response.status_code, 200)
        self.network_cookie = WorkspaceMapSession.objects.filter(
            session_id=self.cookie_client.session.session_key
        ).first()
        return super().setUp()

    def test_map_session_privacy(self) -> None:
        """
        Test that user2 cannot access the network of user 1
        """
        response = self.user_client2.get(reverse('workspace:edit_network', args=[
                                         self.network1.uuid, self.network1.name]))
        self.assertEqual(response.status_code, 404)

    def test_cannot_change_ownership_to_other_user(self) -> None:
        """
        Test that user 1 cannot reassign values of user1's network
        """
        response = self.user_client1.patch(
            reverse('workspace:session_update', args=[self.network2.uuid]), {'zoom': 4})
        self.assertEqual(response.status_code, 404)

    def test_cannot_modify_another_users_features(self) -> None:
        """
        Test that user2 cannot modify values of user1's features
        """
        response = self.user_client2.patch(
            reverse('workspace:get_ap_network', args=[self.ap1.uuid]),
            {'max_radius': 4},
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)

    def test_can_modify_own_features(self) -> None:
        """
        Test that user1 can modify his/her own features
        """
        response = self.user_client1.patch(
            reverse('workspace:get_ap_network', args=[self.ap1.uuid]),
            {'max_radius': 4}, content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
