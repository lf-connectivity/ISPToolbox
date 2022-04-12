from django.urls import reverse_lazy
from workspace.tests.test_geomodels import WorkspaceBaseAPITestCase
from workspace import tasks as workspace_tasks


class PointToPointAsyncTestCase(WorkspaceBaseAPITestCase):
    """
    Verify that async task works as expected
    """
    def test_ptp_results(self):
        # Request to compute the PTP Serviceability of a Link
        response = self.client.post(
            reverse_lazy('workspace:api:ptp-serviceability-create'),
            {'ptp': self.test_ptp_link.pk}
        )
        self.assertEqual(response.status_code, 201)

        # Check that the response matches the defined format
        # changes to the response requires a new API version
        ptp_serviceability_pk = response.data.get('uuid', None)
        self.assertNotEqual(ptp_serviceability_pk, None)

        # Set UUID's and Compare
        EXPECTED_CREATE_RESPONSE = {
            'number_of_obstructions': None,
            'serviceable': 'UNKNOWN',
            'gis_data': None,
            'uuid': str(ptp_serviceability_pk),
            'status': 'UNKNOWN',
            'ptp': str(self.test_ptp_link.pk),
        }
        self.assertJSONEqual(response.content, EXPECTED_CREATE_RESPONSE)

        # Perform a GET and verify nothing has changed
        response = self.client.get(
            reverse_lazy(
                'workspace:api:ptp-serviceability-get',
                kwargs={'uuid': ptp_serviceability_pk}
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertJSONEqual(response.content, EXPECTED_CREATE_RESPONSE)

        # Run async task - synchronously to compute serviceability
        workspace_tasks.calculate_serviceability(ptp_serviceability_pk)

        # Check results of async task
        response = self.client.get(
            reverse_lazy(
                'workspace:api:ptp-serviceability-get',
                kwargs={'uuid': ptp_serviceability_pk}
            )
        )
        self.assertTrue(response.status_code, 200)
        # Results should be modified since the async task ran
        self.assertJSONNotEqual(response.content, EXPECTED_CREATE_RESPONSE)
