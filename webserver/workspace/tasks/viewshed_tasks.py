from celery.utils.log import get_task_logger
from traceback import format_exc
from workspace.models.viewshed_models import Viewshed
import json
import subprocess
from webserver.celery import celery_app as app
from workspace.models import AccessPointLocation
from workspace.tasks.coverage_tasks import calculateCoverage
from workspace.tasks.websocket_utils import updateClientAPStatus, sendMessageToChannel

DEFAULT_MAX_DISTANCE_KM = 3
DEFAULT_PROJECTION = 3857
DEFAULT_OBSTRUCTED_COLOR = [0, 0, 0, 128]
TASK_LOGGER = get_task_logger(__name__)


@app.task
def computeViewshedCoverage(network_id, data, user_id):
    ap_uuid = data['uuid']
    try:
        # Calculate Viewshed for Coverage Area
        computeViewshed(network_id, ap_uuid, user_id)
        # Calculate Buildings that Are Serviceable
        calculateCoverage(ap_uuid, user_id)
        # Update the Client
        updateClientAPStatus(network_id, ap_uuid, user_id)
    except subprocess.CalledProcessError as e:
        # Already logged
        resp = {
            'type': 'ap.unexpected_error',
            'msg': 'An unexpected error occurred, please try again later.',
            'uuid': ap_uuid,
        }
        sendMessageToChannel(network_id, resp)
    except Exception as e:
        # Log this scheisse to cloudwatch
        TASK_LOGGER.error(f'Task failed: {str(e)}')
        for line in format_exc().split('\n'):
            TASK_LOGGER.error(line)
        resp = {
            'type': 'ap.unexpected_error',
            'msg': 'An unexpected error occurred, please try again later.',
            'uuid': ap_uuid,
        }
        sendMessageToChannel(network_id, resp)


def create_progress_status_callback(network_id: str, ap_uuid: str):
    def progress_status_callback(msg, time_remaining):
        resp = {
            'type': 'ap.viewshed_progress',
            'progress': msg,
            'time_remaining': time_remaining,
            'uuid': ap_uuid,
        }
        sendMessageToChannel(network_id, resp)
    return progress_status_callback


def computeViewshed(network_id: str, ap_uuid: str, user_id: int) -> None:
    ap = AccessPointLocation.objects.get(uuid=ap_uuid, owner=user_id)
    try:
        assert(ap.viewshed is not None)
    except Viewshed.DoesNotExist:
        Viewshed(ap=ap).save()
        TASK_LOGGER.info('created new viewshed object')

    if not ap.viewshed.result_cached():
        TASK_LOGGER.info('viewshed result not cached!')
        ap.viewshed.delete()
        Viewshed(ap=ap).save()
        callback = create_progress_status_callback(network_id, ap_uuid)
        ap.viewshed.calculateViewshed(callback)
    else:
        TASK_LOGGER.info('cache hit on viewshed result')

    aoi = ap.getDSMExtentRequired()
    coordinates = json.loads(aoi.envelope.json)
    coordinates = swapCoordinates(coordinates)
    resp = {
        'type': 'ap.viewshed',
        'base_url': ap.viewshed.getBaseTileSetUrl(),
        'maxzoom': ap.viewshed.max_zoom,
        'minzoom': ap.viewshed.min_zoom,
        'uuid': ap_uuid,
    }
    sendMessageToChannel(network_id, resp)


def swapCoordinates(polygon):
    coords = polygon['coordinates'][0]
    new_coords = [[coords[3], coords[2], coords[1], coords[0], coords[3]]]
    polygon['coordinates'] = new_coords
    return polygon
