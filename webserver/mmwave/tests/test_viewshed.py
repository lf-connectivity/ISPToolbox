from django.test import RequestFactory, TestCase
from django.contrib.gis.geos import Point
from mmwave.models import ViewShedJob
from workspace.modesl import AccessPointLocation
from IspToolboxAccounts.models import User
from mmwave import tasks


class TestViewshedSimple(TestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='jacob', email='jacob@gmail.com', password='top_secret')

    def test_create_job(self):
        observer = Point(y=33.54510, x=-90.53714)
        height = 80  # meteres
        target_height = 2  # meters
        job = ViewShedJob(
            owner=self.user,
            observer=observer,
            observer_height=height,
            target_height=target_height,
            radius=500
        )
        job.save()
        self.assertTrue(len(str(job.uuid)) > 10)

        tasks.renderViewshed(job.uuid)

    def test_ws_endpoint(self):
        ap = AccessPointLocation()
        ap.save()
        data = {'uuid': ap.uuid, 'ap_hgt': 15}
        tasks.renderViewshedForAccessPoint('')
        self.assertTrue(data)
