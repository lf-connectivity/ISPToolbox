from django.test import TestCase
import gis_creator.views
# Create your tests here.
class SimpleUSGeoJsonTests(TestCase):
    def test_single_polygon(self):
        