import requests
import logging
import json
import math
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from django.contrib.gis.geos import LineString, Point

from webserver.celery import celery_app as app
from celery.utils.log import get_task_logger
from mmwave.lidar_utils.caching import lidar_cache_get, lidar_cache_set
from mmwave.scripts.create_lidar_availability_preview import createOpenGraphPreviewImage
from datetime import date

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
import traceback

from gis_data.models import MsftBuildingOutlines
from mmwave.lidar_utils.LidarEngine import (
    LidarEngine, LidarResolution, LIDAR_RESOLUTION_DEFAULTS,
    LIDAR_RESOLUTION_MAX_LINK_LENGTH, LidarEngineException
)
from mmwave.lidar_utils.show_latest_pt_clouds import createNewPointCloudAvailability
from shapely.geometry import LineString as shapely_LineString
from mmwave.models import TGLink
from mmwave.scripts.load_lidar_boundaries import (
    loadBoundariesFromEntWine, createInvertedOverlay, getOverlayFromS3,
    HIGH_RES_PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH
)
from mmwave.scripts.create_higher_resolution_boundaries import updatePointCloudBoundariesTask
from isptoolbox_storage.mapbox.upload_tileset import uploadNewTileset
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall


GOOGLE_MAPS_SAMPLE_LIMIT = 512
DEFAULT_NUM_SAMPLES_PER_M = 1
LINK_DISTANCE_LIMIT = 100000
MAXIMUM_NUM_POINTS_RETURNED = 1024
TASK_LOGGER = get_task_logger(__name__)


def createSubLinkFromAoi(tx, rx, aoi=[0, 1]):
    '''
    Returns a shorter tx, rx based on the aoi
    if the aoi = [0, 1] - just returns tx, rx

        Parameters:
                tx (Point): first point in link
                rx (Point): second point in link
                aoi (List): area of interest, two numbers between 0 - 1 where the first number is less than the second

        Returns:
                tx (Point): first point scaled by the first number of aoi
                rx (Point): second point scaled by the second number of aoi
    '''
    link = LineString([tx, rx])
    shapely_link = shapely_LineString(link)
    new_tx = shapely_link.interpolate(aoi[0], normalized=True)
    new_rx = shapely_link.interpolate(aoi[1], normalized=True)
    return Point(new_tx.x, new_tx.y), Point(new_rx.x, new_rx.y)


def getElevationProfile(tx, rx, samples=MAXIMUM_NUM_POINTS_RETURNED):
    """
    tx - Point - GEOS object
    rx - Point - GEOS object

    profile - None | List of objects {'elevation' : float - meters, 'lat' : float, 'lng' : float}
    """
    link_profile, _link = createLinkProfile(tx, rx)
    # If the request is too large, split it into two and add the resulting requests
    if samples > GOOGLE_MAPS_SAMPLE_LIMIT:
        mid_pt = int(samples/2)
        return getElevationProfile(tx, link_profile[mid_pt - 1], mid_pt) + \
            getElevationProfile(link_profile[mid_pt], rx, mid_pt)

    path = str(tx.y) + ',' + str(tx.x) + '|' + str(rx.y) + ',' + str(rx.x)
    params = {'key': google_maps_api_key, 'path': path, 'samples': samples}
    try:
        r = requests.get(
            'https://maps.googleapis.com/maps/api/elevation/json', params=params)
        elevation_resp = r.json()
        profile = [
            {
                'elevation': res['elevation'],
                'lat': res['location']['lat'],
                'lng': res['location']['lng'],
            } for res in elevation_resp['results']
        ]
        return profile

    except Exception:
        return None

    return []


def getDTMPoint(pt: Point) -> float:
    try:
        params = {'key': google_maps_api_key, 'locations': f'{pt.y},{pt.x}'}
        r = requests.get(
            'https://maps.googleapis.com/maps/api/elevation/json', params=params)
        elevation_resp = r.json()
        return elevation_resp['results'][0]['elevation']
    except Exception:
        return math.nan


def createLinkProfile(tx, rx, num_samples=MAXIMUM_NUM_POINTS_RETURNED):
    """
    tx - Point - GEOS object
    rx - Point - GEOS object

    returns List or GEOS points interpolated along the path, and LineString of Link
    """
    link = LineString([tx, rx])
    shapely_link = shapely_LineString(link)
    samples_points = [shapely_link.interpolate(
        i/float(num_samples - 1), normalized=True) for i in range(num_samples)]
    return [Point(pt.x, pt.y) for pt in samples_points], link


def getBuildingProfile(tx, rx):
    """
    tx - Point - GEOS object
    rx - Point - GEOS object
    """
    link_profile, link = createLinkProfile(tx, rx)
    # Query Buildings between point A and B
    buildings = MsftBuildingOutlines.objects.filter(
        geog__intersects=link).values('geog', 'gid').all()

    # Return list of building intersections with gid to indicate intersection
    building_profile = []
    for pt in link_profile:
        buildingFound = False
        for b in buildings:
            if pt.intersects(b['geog']):
                building_profile.append(str(b['gid']))
                buildingFound = True
                break
        if not buildingFound:
            building_profile.append("-1")
    return building_profile


def genLinkDistance(tx, rx):
    requested_link_dist = geopy_distance(
        lonlat(tx.x, tx.y), lonlat(rx.x, rx.y)).meters
    return requested_link_dist


@app.task
def getLinkInfo(network_id, data, user_id=None):
    """
        Validates the link the client sends

        if link is valid - start up async tasks to send terrain / profile
        else - send error message
    """
    resp = {
        'hash': data.get('hash', ''),
        'error': None,
        'type': 'standard.message',
        'handler': 'link',
        'dist': 0,
    }
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id

    try:
        tx = Point([float(f) for f in data.get('tx', [])])
        rx = Point([float(f) for f in data.get('rx', [])])
        fbid = int(data.get('fbid', 0))
        # Create Object to Log User Interaction
        TGLink(tx=tx, rx=rx, fbid=fbid, freq=data.get('freq', 0)).save()
        link_dist_m = genLinkDistance(tx, rx)
        resp['dist'] = link_dist_m
        if link_dist_m > LINK_DISTANCE_LIMIT:
            raise Exception(
                f'''Link too long: limit {LINK_DISTANCE_LIMIT/1000 } km - link {round(link_dist_m / 1000, 3)} km'''
            )
        else:
            getTerrainProfile.delay(network_id, data)
            getLiDARProfile.delay(network_id, data)
    except Exception as e:
        resp['error'] = str(e)

    async_to_sync(channel_layer.group_send)(channel_name, resp)


@app.task
def getLiDARProfile(network_id, data, resolution=LidarResolution.LOW.value):
    """
        Async Task to load LiDAR data profile and send to client,
        calls progressively higher resolution lidar data
    """
    resp = {
        'hash': data.get('hash', ''),
        'error': None,
        'lidar_profile': [],
        'points': 0,
        'url': None,
        'source': 'No LiDAR Available',
        'bb': [],
        'tx': {},
        'rx': {},
        'datasets': '',
        'res': LIDAR_RESOLUTION_DEFAULTS[resolution],
        'dist': 0,
        "type": 'standard.message',
        'handler': 'lidar',
        'aoi': [0, 1],
        'still_loading': False,
        'resolution': resolution
    }
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id
    try:
        tx = Point([float(f) for f in data.get('tx', [])])
        rx = Point([float(f) for f in data.get('rx', [])])
        aoi = data.get('aoi', [0, 1])

        tx_sub, rx_sub = createSubLinkFromAoi(tx, rx, aoi)
        link_dist_m = genLinkDistance(tx_sub, rx_sub)

        r = lidar_cache_get(tx, rx, aoi)
        if r and r['resolution'] >= resolution:
            TASK_LOGGER.info('lidar cache hit: resolution %s', r['resolution'])
            resp.update({k: r[k] for k in
                        ('lidar_profile', 'url', 'bb', 'source', 'tx', 'rx', 'aoi', 'resolution', 'res', 'dist')})

        else:
            TASK_LOGGER.info('lidar cache miss for resolution %s', resolution)

            resp['dist'] = link_dist_m
            le = LidarEngine(
                link=LineString([tx_sub, rx_sub]),
                resolution=LIDAR_RESOLUTION_DEFAULTS[resolution],
                num_samples=MAXIMUM_NUM_POINTS_RETURNED
            )
            resp['lidar_profile'] = le.getProfile()
            resp['url'] = le.getUrls()
            resp['bb'] = le.getBoundingBox()
            resp['source'] = le.getSources()
            resp['tx'] = le.getTxLidarCoord()
            resp['rx'] = le.getRxLidarCoord()
            resp['aoi'] = aoi
            if resp['error'] is None:
                TASK_LOGGER.info(
                    f'updating cache with resolution %s', resp['resolution'])
                lidar_cache_set(tx, rx, aoi, resp)
        if (
            resp['error'] is None and
            resp['resolution'] != LidarResolution.ULTRA and
            link_dist_m < LIDAR_RESOLUTION_MAX_LINK_LENGTH[resp['resolution'] + 1]
        ):
            getLiDARProfile.delay(network_id, data, resp['resolution'] + 1)
            resp['still_loading'] = True
    except LidarEngineException as e:
        resp['error'] = str(e)
    except Exception as e:
        logging.exception('lidar prof error')
        logging.error(f'lidar profile error {e}', exc_info=True)
        TASK_LOGGER.exception("Lidar Profile error")
        TASK_LOGGER.error(f'Error during loading lidar profile: {e} {traceback.format_exc()}', exc_info=True)
        resp['error'] = 'An unexpected error occurred'

    del resp['resolution']
    async_to_sync(channel_layer.group_send)(channel_name, resp)


@app.task
def getTerrainProfile(network_id, data):
    """
        This async task gets the elevation profile between point A and B from Google's
        Elevation API
    """
    resp = {
        'hash': data.get('hash', ''),
        'error': None,
        'source': 'Google Elevation API',
        'terrain_profile': [],
        'type': 'standard.message',
        'handler': 'terrain',
        'dist': 0,
        'aoi': [0, 1]
    }
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id

    try:
        tx = Point([float(f) for f in data.get('tx', [])])
        rx = Point([float(f) for f in data.get('rx', [])])
        aoi = data.get('aoi', [0, 1])
        tx_sub, rx_sub = createSubLinkFromAoi(tx, rx, aoi)
        resp['dist'] = genLinkDistance(tx_sub, rx_sub)
        resp['terrain_profile'] = getElevationProfile(tx_sub, rx_sub)
        resp['aoi'] = aoi
    except Exception as e:
        TASK_LOGGER.error(
            f'Error occurred during generating terrain profile: {e}')
        resp['error'] = str(e)

    async_to_sync(channel_layer.group_send)(channel_name, resp)


@app.task
def pullLatestPointCloudsEntwine():
    """
    This task automatically queries entwine for USGS point clouds and saves the new point clouds in the database
    by default: sends an email notification to isptoolbox@fb.com on error, otherwise stays silent

    """
    loadBoundariesFromEntWine()
    createInvertedOverlay()


@app.task
def addHighResolutionBoundaries():
    """
    This task updates the lidar boundaries and availability overlay

    1. computes the high resolution boundaries for PointClouds that do not have it and stores to database
    2. calculates the lidar availability overlay
    3. uploads the availability overlay to mapbox as a tileset

    """
    updatePointCloudBoundariesTask()
    createInvertedOverlay(use_high_resolution_boundaries=True, invert=True)


@app.task
def uploadBoundaryTilesetMapbox():
    """
    This task takes the boundaries stored as geojsons in S3 and uploads them to mapbox
    to create tilesets

    """
    overlays = [
        {
            'tileset_name': 'highreslidarboundary',
            's3': HIGH_RES_PT_CLOUD_AVAILABILITY_OVERLAY_S3_PATH
        }
    ]
    for overlay in overlays:
        overlay_geojson = getOverlayFromS3(overlay['s3'])
        overlay_name = overlay['tileset_name']
        try:
            resp, data = uploadNewTileset(overlay_geojson, overlay_name)
            if resp.status_code == 201:
                sendEmailToISPToolboxOncall(
                    f'[Automated Message] Succesfully created updated overlay: {overlay_name}',
                    f'Updated overlay in mapbox {overlay_name}')
            else:
                sendEmailToISPToolboxOncall(
                    f'[Automated Message] Failed to update Overlay: {overlay_name}',
                    f'Failed to update overlay: {overlay_name}\nresp: {resp.status_code}\n' +
                    f'data:\n {json.dumps(data)}')
        except Exception as e:
            sendEmailToISPToolboxOncall(
                f'[Automated Message] Failed to update Overlay {overlay_name}',
                f"""Failed to update overlay: {overlay_name}\n
                exception: {str(e)}\n
                traceback:\n{traceback.format_exc()}""")
    createOpenGraphPreviewImage(date.today())


@app.task
def createNewlyAddedCloudOverlay():
    """
    This task creates an overlay of the newly added point clouds, so we can show new users
    (last 30 days)

    """
    try:
        path = createNewPointCloudAvailability()
        sendEmailToISPToolboxOncall(
            '[Automated Message] Updated Latest Added Point Clouds Overlay',
            f'Updated S3 {path}')
    except Exception as e:
        sendEmailToISPToolboxOncall(
            '[Automated Message] Failed to update Latest Added Point Clouds Overlay',
            f"""Failed to update overlay: \n
            exception: {str(e)}\n
            traceback:\n{traceback.format_exc()}""")
