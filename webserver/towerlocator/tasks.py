from celery import shared_task
import requests
import json
import io
from IspToolboxApp.Tasks.MarketEvaluatorHelpers import createPipelineFromKMZ
from bots.github_issues import make_github_issue
from .models import TowerLocatorMarket

# This UID and key are used for the cloudrf API, currently using the 10,000 requests/month plan
cloud_rf_uid = '27141'
cloud_rf_key = '71492256a3cd1e54e14f6413842f1ab41c907664'

# https://api.cloudrf.com/
headers = {'Content-Type': 'application/x-www-form-urlencoded'}


def createCloudRFRequest(lat, lon, txh):
    return {
        "uid": cloud_rf_uid,
        "key": cloud_rf_key,
        "lat": lat,
        "lon": lon,
        "txh": txh,
        "frq": 868,
        "rxh": 2,
        "dis": 'm',
        "txw": 0.1,
        "txg": 2.14,
        "rxg": 2.14,
        "pm": 2,
        "pe": 1,
        "res": 90,
        "rad": 6,
        "out": 2,
        "rxs": -95,
        "ant": 38,
        "azi": 0,
        "bwi": 0.1,
        "ber": 0,
        "blu": -120,
        "clm": 0,
        "cli": 5,
        "cll": 0,
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
        "mat": 0.0
    }


@shared_task
def getViewShed(tower_id):
    tower = TowerLocatorMarket.objects.get(uuid=tower_id)
    request_body = createCloudRFRequest(tower.location[0], tower.location[1], tower.height)
    resp = {}
    retries = 3
    try:
        while retries > 0 and resp.get('kmz') is None:
            retries -= 1
            response = requests.post('https://cloudrf.com/API/area', data=request_body, headers=headers)
            resp = response.json()
        # else request KMZ file, add geometry collection to pipeline and run market evaluator pipeline
        kmz_response = requests.get(resp['kmz'])
        kmz_file = io.BytesIO(kmz_response.content)
        tower.coverage = json.dumps(createPipelineFromKMZ(kmz_file))
        tower.save(update_fields=['coverage'])

    except Exception as e:
        # if something goes wrong, create a github issue
        # TODO: check if a viewshed issue already exists
        make_github_issue(
            title='Could not create viewshed',
            body=f"{tower.location},{tower.height},{tower.uuid},{json.dumps(resp)} error: {str(e)}",
            labels=['viewshed', 'cloudrf']
        )
