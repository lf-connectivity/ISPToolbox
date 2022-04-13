from django.urls import reverse_lazy
from workspace.tests.test_geomodels import WorkspaceBaseAPITestCase
from workspace import tasks as workspace_tasks
from django.contrib.gis.geos import GEOSGeometry
from mmwave import models as mmwave_models


class PointToPointAsyncTestCase(WorkspaceBaseAPITestCase):
    def setUp(self):
        super().setUp()
        polygon = GEOSGeometry("""
        {
        "type": "Polygon",
        "coordinates": [
          [
            [
              -90.53931713104248,
              33.547546782478754
            ],
            [
              -90.54167747497559,
              33.54085812669445
            ],
            [
              -90.53605556488037,
              33.53824690667674
            ],
            [
              -90.53009033203125,
              33.54246774356695
            ],
            [
              -90.53931713104248,
              33.547546782478754
            ]
          ]
        ]
      }""")
        self.test_cloud = mmwave_models.EPTLidarPointCloud(
            name="MS_MSDeltaYazoo-Phase1_2009", count=1,
            url="https://s3-us-west-2.amazonaws.com/usgs-lidar-public/MS_MSDeltaYazoo-Phase1_2009/ept.json",
            srs=3857,
            boundary=polygon
        )
        self.test_cloud.save()
        return

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
        EXPECTED_GET_RESPONSE = {
            'number_of_obstructions': 3,
            'serviceable': 'UNSERVICEABLE',
            'gis_data': response.json()['gis_data'],
            'uuid': str(ptp_serviceability_pk),
            'status': 'UNKNOWN',
            'ptp': str(self.test_ptp_link.pk),
        }
        self.assertTrue(response.status_code, 200)
        # Results should be modified since the async task ran
        self.assertJSONEqual(response.content, EXPECTED_GET_RESPONSE)
