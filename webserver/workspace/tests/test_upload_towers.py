# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test.client import Client
from workspace.tests.test_geomodels import WorkspaceBaseTestCase
from django.urls import reverse_lazy
from workspace.models import AccessPointLocation
import io


class BulkUploadTowerTest(WorkspaceBaseTestCase):
    TEST_CSV = """Name,Radius(mi),Height(ft),Latitude,Longitude
Sunflower MS 2_4, 6, 45, 33.545070, -90.537152"""

    def setUp(self):
        super().setUp()
        self.client = Client()
        self.client.force_login(user=self.testuser)

    def test_bulk_upload_towers(self):
        bulk_upload_csv = io.StringIO(self.TEST_CSV)
        response = self.client.post(
            reverse_lazy('workspace:bulk_tower_upload'),
            {"file": bulk_upload_csv, "map_session": self.test_session.pk},
            format='multipart')
        self.assertEqual(response.status_code, 302)
        ap = AccessPointLocation.objects.get(map_session=self.test_session.pk, name='Sunflower MS 2_4')
        self.assertAlmostEqual(ap.height_ft, 45)
