import requests
import json
import io
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import createPipelineFromKMZ
from bots.github_issues import make_github_issue
from django.conf import settings

from workspace.models import AccessPointLocation


cloud_rf_uid = settings.CLOUDRF_UID
cloud_rf_key = settings.CLOUDRF_KEY

# https://api.cloudrf.com/
headers = {'Content-Type': 'application/x-www-form-urlencoded'}


def createCloudRFRequest(lat, lon, txh, rxh, rad):
    return {
        "uid": cloud_rf_uid,
        "key": cloud_rf_key,
        "lat": lat,
        "lon": lon,
        "txh": txh,
        "frq": 868,
        "rxh": rxh,
        "dis": 'm',
        "txw": 0.1,
        "txg": 2.14,
        "rxg": 2.14,
        "pm": 2,
        "pe": 1,
        "res": 90,
        "rad": rad,
        "out": 2,
        "rxs": -95,
        "ant": 38,
        "azi": 0,
        "bwi": 0.1,
        "ber": 0,
        "blu": -120,
        "clm": 0,
        "cli": 5,
        "cll": 1,
        "fbr": 0,
        "file": 'kmz',
        "grn": -90,
        "hbw": 0,
        "ked": 0,
        "mod": 0,
        "nam": 'isptoolbox',
        "net": 'isptoolbox_net',
        "out": 2,
        "pol": 'v',
        "red": -60,
        "ter": 4,
        "tlt": 0,
        "vbw": 0,
        "col": 10,
        "rel": 90,
        "nf": -101,
        "mat": 0.03
    }


def getViewShed(lat, lon, height, customerHeight, radius, apUuid=None):
    '''
        Gets a viewshed (json polygon coverage) from an access point:

        Params:
        lat<Number>: Latitude
        lon<Number>: Longitude
        height<Number>: Height of transmitter in meters
        radius<Number>: Radius of coverage in km
        apUuid<UUID>: UUID of AP

        Returns geojson for viewshed
    '''
    request_body = createCloudRFRequest(lat, lon, height, customerHeight, radius)
    resp = {}
    retries = 3
    try:
        while retries > 0 and resp.get('kmz') is None:
            retries -= 1
            response = requests.post('https://api.cloudrf.com/API/area', data=request_body, headers=headers)
            resp = response.json()
        # else request KMZ file, add geometry collection to pipeline and run market evaluator pipeline
        kmz_response = requests.get(resp['kmz'])
        kmz_file = io.BytesIO(kmz_response.content)
        coverage = createPipelineFromKMZ(kmz_file)
        resp = {
            'error': 0,
            'coverage': coverage
        }

        if apUuid:
            ap = AccessPointLocation.objects.get(uuid=apUuid)
            ap.cloudrf_coverage_geojson = coverage
            ap.save()
            response['ap_uuid'] = apUuid

        return resp

    except Exception as e:
        # if something goes wrong, create a github issue
        # TODO: check if a viewshed issue already exists
        make_github_issue(
            title='Could not create viewshed',
            body=f"{lat},{lon},{json.dumps(resp)} error: {str(e)}",
            labels=['viewshed', 'cloudrf']
        )
        resp = {'error': -1}
        return resp
