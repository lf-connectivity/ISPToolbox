from defusedxml import ElementTree
from django.test import TestCase
from IspToolboxApp.Helpers.kmz_helpers import createAirlinkGeoJsonsFromKML


TEST_KML = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
<Folder>
<name>Site</name>
<Placemark>
<Point>
<coordinates>-73.9700336878052,40.76328589100817,26</coordinates>
</Point>
</Placemark>
<Folder>
<name>Station</name>
<Placemark>
<Point>
<coordinates>-73.94595818058566,40.75746404569566,15</coordinates>
</Point>
</Placemark>
</Folder>
</Folder>
<Folder>
</Folder>
</Document>
</kml>
"""


class TestAirlinkKML(TestCase):
    def test_kml_parse(self):
        xml = ElementTree.fromstring(TEST_KML)
        feats = createAirlinkGeoJsonsFromKML(xml)
        self.assertTrue(True)
        self.assertEqual(len(feats), 2)
