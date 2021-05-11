from workspace.models.viewshed_models import ViewshedModel
import json
from webserver.celery import celery_app as app
from workspace.models import AccessPointLocation
from workspace.tasks.coverage_tasks import calculateCoverage
from workspace.tasks.websocket_utils import updateClientAPStatus, sendMessageToChannel
import logging

DEFAULT_MAX_DISTANCE_KM = 3
DEFAULT_PROJECTION = 3857
DEFAULT_OBSTRUCTED_COLOR = [0, 0, 0, 128]


@app.task
def computeViewshedCoverage(network_id, data, user_id):
    ap_uuid = data['uuid']
    # Calculate Viewshed for Coverage Area
    computeViewshed(network_id, ap_uuid, user_id)
    # Calculate Buildings that Are Serviceable
    calculateCoverage(ap_uuid, user_id)
    # Update the Client
    updateClientAPStatus(network_id, ap_uuid, user_id)


def computeViewshed(network_id: str, ap_uuid: str, user_id: int) -> None:
    ap = AccessPointLocation.objects.get(uuid=ap_uuid, owner=user_id)
    try:
        assert(ap.viewshedmodel is not None)
    except ViewshedModel.DoesNotExist:
        ViewshedModel(ap=ap).save()
        logging.info('created new viewshed object')

    if not ap.viewshedmodel.result_cached():
        logging.info('viewshed result not cached!')
        ap.viewshedmodel.calculateViewshed()
    else:
        logging.info('cache hit on viewshed result')

    aoi = ap.getDSMExtentRequired()
    coordinates = json.loads(aoi.envelope.json)
    coordinates = swapCoordinates(coordinates)
    resp = {
        'type': 'ap.viewshed',
        'url': ap.viewshedmodel.create_presigned_url(),
        'coordinates': coordinates,
    }
    sendMessageToChannel(network_id, resp)


def swapCoordinates(polygon):
    coords = polygon['coordinates'][0]
    new_coords = [[coords[3], coords[2], coords[1], coords[0], coords[3]]]
    polygon['coordinates'] = new_coords
    return polygon
