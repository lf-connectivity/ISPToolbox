from .test_geomodels import WorkspaceBaseTestCase
from django.urls import reverse_lazy


class FormTestCase(WorkspaceBaseTestCase):
    """
    Verify that we can successfully request forms for network elements
    """
    tool = "los_check"

    def setUp(self):
        super().setUp()
        self.client.force_login(self.testuser)

    def test_getting_sector_form(self):
        endpoint = reverse_lazy(
            'workspace:tower-form',
            kwargs={'tool': self.tool, 'uuid': self.test_ap.pk}
        )
        response = self.client.get(endpoint)
        self.assertEqual(response.status_code, 200)

    def test_getting_tower_form(self):
        endpoint = reverse_lazy(
            'workspace:sector-form',
            kwargs={'tool': self.tool, 'uuid': self.test_sector.pk}
        )
        response = self.client.get(endpoint)
        self.assertEqual(response.status_code, 200)
