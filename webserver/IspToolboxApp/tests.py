from django.test import TestCase, Client
import tempfile
import shutil
import os
import json
from IspToolboxApp.Tests.marketing_model_tests import TestMarketingModels

class TestHealthCheckEndpoint(TestCase):
    def test_healthcheck(self):
        client = Client()
        response = client.get('/')
        self.assertIs(response.status_code, 200)

class TestKMZEndpoints(TestCase):
    def test_kmz_endpoint(self):
        client = Client()
        response = client.post('/market-evaluator/kmz/')
        self.assertIs(response.status_code, 200)
        
class TestKMZUpload(TestCase):
    def test_kmz_upload(self):
        client = Client()
        kml = b"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">
  <name>Cube</name>
  <Placemark>
    <Polygon>
      <extrude>1</extrude>
      <altitudeMode>relativeToGround</altitudeMode>
      <outerBoundaryIs>
				<LinearRing>
					<coordinates>
						8.542634850324216,47.36654315613557,100 
            8.54263475978412,47.36550030198994,100 
            8.544161875287033,47.36550183316037,100
            8.54416186368919,47.36654140446431,100
            8.542634850324216,47.36654315613557,100
					</coordinates>
				</LinearRing>
      </outerBoundaryIs>
    </Polygon>
   <!-- - - - - - - - - - - - - - - - - - - - - - - -->
	  <LookAt>
	  	<longitude> 8.543151875920312 </longitude>
	  	<latitude>  47.36561202482072 </latitude>
	  	<altitude>  0                 </altitude>
	  	<heading>   45                </heading>
	  	<tilt>      64                </tilt>
	  	<range>     843               </range>
	  	<gx:altitudeMode>relativeToSeaFloor</gx:altitudeMode>
	  </LookAt>
  </Placemark>
</kml>
"""
        output_kml_file = 'test.kml'
        tmpdir = tempfile.mkdtemp()
        tmpdirout = tempfile.mkdtemp()
        try:
            with open(os.path.join(tmpdir, output_kml_file), 'wb') as fp:
                fp.write(kml)
            tmparchive = os.path.join(tmpdirout, 'archive')
            shutil.make_archive(tmparchive, 'zip', tmpdir)
            with open(tmparchive + '.zip', 'rb') as fp:
                response = client.post('/market-evaluator/kmz/',{'kmz' : fp})
                content = json.loads(response.content)
                self.assertIs(content['error'], None)
                self.assertTrue(len(content['uuid']) > 20)
                self.assertIs(response.status_code, 200)
        finally:
            shutil.rmtree(tmpdir)
            shutil.rmtree(tmpdirout)

