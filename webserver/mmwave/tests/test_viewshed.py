from django.test import RequestFactory, TestCase
from django.contrib.gis.geos import Point
from workspace.models import ViewshedModel, AccessPointLocation
from IspToolboxAccounts.models import User


class TestViewshedSimple(TestCase):
    def setUp(self):
        # Every test needs access to the request factory.
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            email='jacob@gmail.com', password='top_secret',
            first_name='jacob', last_name="bob"
        )

    def test_create_job(self):
        observer = Point(y=33.54510, x=-90.53714)
        height = 80  # meteres
        ap = AccessPointLocation(
            name="hi",
            owner=self.user,
            geojson=observer,
            max_radius=3,
            height=height
        )
        ap.save()
        vs = ViewshedModel(ap=ap)
        vs.save()
        self.assertTrue(vs.pk > 0)

        # tasks.renderViewshed(job.uuid)
