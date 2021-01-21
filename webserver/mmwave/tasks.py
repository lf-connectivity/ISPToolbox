import requests
import re
from enum import IntEnum
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from django.contrib.gis.geos import LineString, Point

from celery import shared_task
from celery.decorators import periodic_task
from celery.schedules import crontab

from django.conf import settings

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from mmwave.models import Msftcombined, TreeCanopy
from shapely.geometry import LineString as shapely_LineString
from mmwave.lidar_utils.pdal_templates import getLidarPointsAroundLink
from mmwave.models import EPTLidarPointCloud, TGLink
from mmwave.scripts.load_lidar_boundaries import loadBoundariesFromEntWine, createInvertedOverlay
from mmwave.scripts.create_higher_resolution_boundaries import updatePointCloudBoundariesTask
from isptoolbox_storage.mapbox.upload_tileset import uploadNewTileset


GOOGLE_MAPS_SAMPLE_LIMIT = 512
MAXIMUM_NUM_POINTS_RETURNED = 1024
DEFAULT_NUM_SAMPLES_PER_M = 1
LINK_DISTANCE_LIMIT = 100000


class LidarResolution(IntEnum):
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    ULTRA = 4


LIDAR_RESOLUTION_DEFAULTS = {
    LidarResolution.LOW: 10,
    LidarResolution.MEDIUM: 5,
    LidarResolution.HIGH: 1,
    LidarResolution.ULTRA: 0.5
}

LIDAR_RESOLUTION_MAX_LINK_LENGTH = {
    LidarResolution.LOW: LINK_DISTANCE_LIMIT,
    LidarResolution.MEDIUM: 50000,
    LidarResolution.HIGH: 2000,
    LidarResolution.ULTRA: 1000,
}


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
        r = requests.get('https://maps.googleapis.com/maps/api/elevation/json', params=params)
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


def createLinkProfile(tx, rx, num_samples=MAXIMUM_NUM_POINTS_RETURNED):
    """
    tx - Point - GEOS object
    rx - Point - GEOS object

    returns List or GEOS points interpolated along the path, and LineString of Link
    """
    link = LineString([tx, rx])
    shapely_link = shapely_LineString(link)
    samples_points = [shapely_link.interpolate(i/float(num_samples - 1), normalized=True) for i in range(num_samples)]
    return [Point(pt.x, pt.y) for pt in samples_points], link


def getClutterProfile(tx, rx):
    """
    """

    return []


def getTreeCanopyProfile(tx, rx):
    """
    tx - Point - GEOS object
    rx - Point - GEOS object
    """
    link_profile, link = createLinkProfile(tx, rx)
    return [TreeCanopy.getPointValue(pt) for pt in link_profile]


def selectLatestProfile(clouds):
    pattern_year = re.compile(r'2[0-9][0-9][0-9]')
    """
    Returns the most recent lidar dataset
    """
    # Search for year in URL data
    years = [[int(yr) for yr in pattern_year.findall(cloud.url)] for cloud in clouds]
    max_years = [max(year) if len(year) > 0 else 0 for year in years]
    return clouds[max_years.index(max(max_years))]


def getLidarProfile(tx, rx, resolution=5):
    """
    Returns a list of lidar points between tx and rx and number of points between the two

    Tuple: (List, Int, String)

    """
    link = LineString([tx, rx])
    pt_clouds = EPTLidarPointCloud.objects.filter(boundary__intersects=link).all()
    if len(pt_clouds) == 0:
        raise Exception('Lidar data not available')

    # Select the most relevant dataset
    cloud = selectLatestProfile(pt_clouds)

    # Get URL of point cloud
    ept_path = cloud.url
    link.srid = 4326
    # TODO achong: all entwine are in EPSG:3857 coordinate system, but future EPT's could
    # be in a different coordinate system
    lidar_profile, count, bb, link_T = getLidarPointsAroundLink(
        ept_path, link, 3857, resolution=resolution, num_samples=MAXIMUM_NUM_POINTS_RETURNED)
    return lidar_profile, count, ept_path, bb, cloud.name, link_T[0], link_T[1]


def getBuildingProfile(tx, rx):
    """
    tx - Point - GEOS object
    rx - Point - GEOS object
    """
    link_profile, link = createLinkProfile(tx, rx)
    # Query Buildings between point A and B
    buildings = Msftcombined.objects.using('gis_data').filter(geog__intersects=link).values('geog', 'gid').all()

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
    requested_link_dist = geopy_distance(lonlat(tx.x, tx.y), lonlat(rx.x, rx.y)).meters
    return requested_link_dist


@shared_task
def getLinkInfo(network_id, data):
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
        fbid = int(data.get('id', 0))
        # Create Object to Log User Interaction
        TGLink(tx=tx, rx=rx, fbid=fbid).save()
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


@shared_task
def getLiDARProfile(network_id, data, resolution=LidarResolution.LOW):
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
        'handler': 'lidar'
    }
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id
    try:
        tx = Point([float(f) for f in data.get('tx', [])])
        rx = Point([float(f) for f in data.get('rx', [])])
        link_dist_m = genLinkDistance(tx, rx)
        resp['dist'] = link_dist_m
        lidar_profile, pt_count, ept_path, bb, name, tx_T, rx_T = getLidarProfile(
            tx,
            rx,
            LIDAR_RESOLUTION_DEFAULTS[resolution]
        )
        resp['lidar_profile'] = lidar_profile
        resp['url'] = ept_path
        resp['source'] = name
        resp['bb'] = bb
        resp['tx'] = tx_T
        resp['rx'] = rx_T
        if (
                resp['error'] is None and
                resolution != LidarResolution.ULTRA and
                link_dist_m < LIDAR_RESOLUTION_MAX_LINK_LENGTH[resolution + 1]
        ):
            getLiDARProfile.delay(network_id, data, resolution + 1)
    except Exception as e:
        resp['error'] = str(e)

    async_to_sync(channel_layer.group_send)(channel_name, resp)


@shared_task
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
    }
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id

    try:
        tx = Point([float(f) for f in data.get('tx', [])])
        rx = Point([float(f) for f in data.get('rx', [])])
        resp['dist'] = genLinkDistance(tx, rx)
        resp['terrain_profile'] = getElevationProfile(tx, rx)
    except Exception as e:
        resp['error'] = str(e)

    async_to_sync(channel_layer.group_send)(channel_name, resp)


@shared_task
def getLOSProfile(network_id, data, resolution=LidarResolution.LOW):
    resp = {
        'error': None,
        'tree_profile': None,
        'building_profile': None,
        'terrain_profile': None,
        'lidar_profile': None,
        'points': 0,
        'url': None,
        'name': None,
        'bb': [],
        'tx': {},
        'rx': {},
        'hash': None,
        'datasets': '',
        'res': 'low',
        "type": 'standard.message'
    }
    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id
    try:
        tx = Point([float(f) for f in data.get('tx', [])])
        rx = Point([float(f) for f in data.get('rx', [])])
        resp['hash'] = data.get('hash', None)
        fbid = int(data.get('fbid', 0))
        resp['res'] = f'{LIDAR_RESOLUTION_DEFAULTS[resolution]} m'
        # Create Object to Log User Interaction
        TGLink(tx=tx, rx=rx, fbid=fbid).save()
        link_dist_m = genLinkDistance(tx, rx)
        if link_dist_m > LINK_DISTANCE_LIMIT:
            resp['error'] = f'''Link too long: limit {
                LINK_DISTANCE_LIMIT/1000 } km - link {round(link_dist_m / 1000, 3)} km'''
            async_to_sync(channel_layer.group_send)(channel_name, resp)
            return None

        terrain_profile = getElevationProfile(tx, rx)
        resp['terrain_profile'] = terrain_profile
        try:
            lidar_profile, pt_count, ept_path, bb, name, tx_T, rx_T = getLidarProfile(
                tx,
                rx,
                LIDAR_RESOLUTION_DEFAULTS[resolution]
            )
            resp['lidar_profile'] = lidar_profile
            resp['points'] = pt_count
            resp['url'] = ept_path
            resp['name'] = name
            resp['bb'] = bb
            resp['tx'] = tx_T
            resp['rx'] = rx_T
            resp['datasets'] = f'{name} & Google Elevation API'
        except Exception as e:
            resp['error'] = str(e)
        async_to_sync(channel_layer.group_send)(channel_name, resp)
        if resp['error'] is None and resolution != LidarResolution.ULTRA:
            getLOSProfile.delay(network_id, data, resolution + 1)

    except Exception as e:
        resp["error"] = "An unexpected error occured: " + str(e)
        async_to_sync(channel_layer.group_send)(channel_name, resp)


if settings.PROD:
    @periodic_task(run_every=(crontab(minute=0, hour=8)), name="refresh_lidar_point_cloud")
    def updatePointCloudData():
        """
        This task automatically queries entwine for USGS point clouds and saves the new point clouds in the database
        by default: sends an email notification to isptoolbox@fb.com on error, otherwise stays silent

        """
        loadBoundariesFromEntWine()
        overlay = createInvertedOverlay()
        uploadNewTileset(overlay, 'lowreslidarboundary')

    @periodic_task(run_every=(crontab(minute=0, hour=20)), name="add_high_resolution_boundary")
    def addHighResolutionBoundaries():
        """
        This task updates the lidar boundaries and availability overlay

        1. computes the high resolution boundaries for PointClouds that do not have it and stores to database
        2. calculates the lidar availability overlay
        3. uploads the availability overlay to mapbox as a tileset

        """
        updatePointCloudBoundariesTask()
        overlay = createInvertedOverlay(use_high_resolution_boundaries=True, invert=True)
        uploadNewTileset(overlay, 'highreslidarboundary')
