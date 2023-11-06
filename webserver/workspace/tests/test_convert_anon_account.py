# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase
from django.test import Client
from workspace import models as workspace_models
from django.contrib.gis.geos import GEOSGeometry
from guest_user.functions import is_guest_user


class ConvertAnonToUserTestCase(TestCase):
    """
    Verifies that function will correctly attribute objects created by anonymous session
    to new user
    """

    def setUp(self) -> None:
        self.client = Client()
        return super().setUp()

    def test_account_creation(self):
        # Start Creating Objects With Guest User Session
        response = self.client.get('/pro/network/edit/')
        self.assertTrue(response.status_code == 200)
        self.user = response.context.get('user')
        num_sessions = workspace_models.WorkspaceMapSession.objects.filter(
            owner=self.user
        ).count()
        self.test_session = workspace_models.WorkspaceMapSession.objects.get(
            owner=self.user
        )
        self.assertGreater(num_sessions, 0)

        # Add Tower and CPE
        self.test_ap = workspace_models.AccessPointLocation(
            owner=self.user,
            name='testap',
            map_session=self.test_session,
            geojson=GEOSGeometry("""{
                "type": "Point",
                "coordinates": [-121.777777777777, 38.98777777777777],
            }"""),
        )
        self.test_sector = workspace_models.AccessPointSector(
            owner=self.user,
            name='test_sector',
            map_session=self.test_session,
            ap=self.test_ap,
        )
        self.test_sector.save()
        self.test_ap.save()
        # Run Account Creation
        self.assertTrue(is_guest_user(self.user))

        # Check owner fields of all objects
        self.test_sector.refresh_from_db()
        self.test_ap.refresh_from_db()
        self.test_session.refresh_from_db()

        self.assertEquals(self.test_ap.owner, self.user)
        self.assertEquals(self.test_sector.owner, self.user)
        self.assertEquals(self.test_session.owner, self.user)
