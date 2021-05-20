from .test_geomodels import WorkspaceBaseTestCase
from workspace.models import WorkspaceMapSessionSerializer


class WorkspaceSessionTestCase(WorkspaceBaseTestCase):
    def test_session_duplication(self):
        """
        Test duplication method on workspace session
        """
        new_session = self.test_session.duplicate()
        self.assertNotEqual(new_session.uuid, self.test_session.uuid)
        self.assertGreater(new_session.accesspointlocation_set.count(), 0)
        self.assertGreater(new_session.cpelocation_set.count(), 0)
        self.assertGreater(new_session.aptocpelink_set.count(), 0)
        for ap in new_session.accesspointlocation_set.all():
            self.assertNotEqual(self.test_ap.uuid, ap.uuid)
        for cpe in new_session.cpelocation_set.all():
            self.assertNotEqual(self.test_cpe.uuid, cpe.uuid)
        for link in new_session.aptocpelink_set.all():
            self.assertNotEqual(self.test_ap_cpe_link.uuid, link.uuid)

    def test_session_serializer(self):
        """
        Test serializer on workspace session
        """
        serialized_session = WorkspaceMapSessionSerializer(self.test_session).data
        self.assertEqual(serialized_session['uuid'], str(self.test_session.uuid))
        self.assertEqual(serialized_session['number_of_towers'], self.test_session.number_of_towers)
