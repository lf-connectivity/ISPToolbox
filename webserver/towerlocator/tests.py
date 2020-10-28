from django.test import TestCase
from django.test import Client
from .tasks import getViewShed
from .models import TowerLocatorMarket
from django.contrib.gis.geos import Point


class TestTowerLocatorV2(TestCase):
    def test_client_interface(self):
        c = Client()
        response = c.post(
            '/towerlocator/viewshed/',
            {'lat': 37.5124, 'lng': -121.8805, 'height': 20},
        )
        self.assertEqual(response.status_code, 200)

    def test_get_viewshed(self):
        tower = TowerLocatorMarket(location=Point([37.5124, -121.8805]), height=20)
        tower.save()
        getViewShed(tower_id=tower.uuid)
        tower.refresh_from_db()
        self.assertTrue(tower.coverage.area > 0)
