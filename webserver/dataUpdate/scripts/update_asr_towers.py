import json
import traceback
import tempfile
from datetime import datetime
from zipfile import ZipFile
import shutil
import urllib.request as request
from contextlib import closing
from ftplib import FTP
from urllib.parse import urlparse

from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.files.base import ContentFile
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall

from dataUpdate.models import Source
from isptoolbox_storage.mapbox.upload_tileset import uploadNewTileset
from isptoolbox_storage.storage import S3ManifestStorage
from mmwave.scripts.load_lidar_boundaries import getOverlayFromS3

# flake8: noqa
ASR_REGISTRATION_URL = 'https://wireless2.fcc.gov/UlsApp/AsrSearch/asrRegistration.jsp'
FCC_DATA_URL = 'ftp://wirelessftp.fcc.gov/pub/uls/complete/r_tower.zip'


ASR_S3_PATH = 'asr-tower-locator.geojson'
ASR_MAPBOX_OVERLAY = 'asr-towers'

TYPE_MAP = {
        'B': 'Building',
        'BANT': 'Building with Antenna',
        'BMAST': 'Building with Mast',
        'BPIPE': 'Building with Pipe',
        'BPOLE': 'Building with Pole',
        'BRIDG': 'Bridge',
        'BTWR': 'Building with Tower',
        'GTOWER': 'Guyed Tower',
        'LTOWER': 'Lattice Tower',
        'MAST': 'Mast',
        'MTOWER': 'Monopole',
        'NNGTANN': 'Guyed Tower Array',
        'NNLTANN': 'Lattice Tower Array',
        'NNMTANN': 'Monopole Array',
        'PIPE': 'Pipe',
        'POLE': 'Pole',
        'RIG': 'Oil (or other rig)',
        'SIGN': 'Sign or Billboard',
        'SILO': 'Silo',
        'STACK': 'Smoke Stack',
        'TANK': 'Tank (Water, Gas, etc)',
        'TREE': 'Tree',
        'TOWER': 'Tower',
        'UPOLE': 'Utility Pole/Tower',
        'UNKN': 'Unknown',
}

# https://www.fcc.gov/sites/default/files/pubacc_asr_codes_data_elem.pdf
STATUS_CODES = {
        'A': 'Cancelled',
        'C': 'Constructed',
        'D': 'Dismissed',
        'G': 'Granted',
        'I': 'Dismantled',
        'N': 'Inactive',
        'O': 'Owner removed',
        'P': 'Pending',
        'R': 'Returned',
        'T': 'Terminated',
        'W': 'Withdrawn',
        'UNKN': 'Unknown'
}

TASK_LOGGER = get_task_logger(__name__)


def getTowerUrl(unique_identifier):
    return f'{ASR_REGISTRATION_URL}?regKey={unique_identifier}'


def getTimestampOfUpdate():
    parsed_fcc_url = urlparse(FCC_DATA_URL)
    ftp = FTP(parsed_fcc_url.netloc)
    ftp.login()

    # Use MDTM command and ignore the first 4 characters (response code + space) and last 6 (HHMMSS)
    timestamp = ftp.sendcmd(f'MDTM {parsed_fcc_url.path}')[4:].strip()[:-6]
    return datetime.strptime(timestamp, '%Y%m%d')


def coordinateConvert(direction, seconds):
    flag = 1 if direction in ('N', 'E') else -1
    return round(flag * float(seconds) / 3600, 6)


def retrieveDataMaps():
    TASK_LOGGER.info('STEP 1. Downloading FCC Data')
    with tempfile.TemporaryDirectory() as tempdir:
        zip_file = f'{tempdir}/fccTower'
        with closing(request.urlopen(FCC_DATA_URL)) as fsftp:
            with open(zip_file, 'wb') as fzip:
                shutil.copyfileobj(fsftp, fzip)
            TASK_LOGGER.info('    DONE: Downloading FCC Data\n')
            TASK_LOGGER.info('STEP 2. Extract Files')
            with ZipFile(zip_file, 'r') as zipfile:
                zipfile.extractall(tempdir)
            TASK_LOGGER.info('    DONE: Extract Files\n')
        TASK_LOGGER.info('STEP 3. Mapping CO.dat & RA.dat & EN.dat')
        co_map = dict()
        co_path = f'{tempdir}/CO.dat'
        with open(co_path) as fread:
            lines = [line.split('|') for line in fread.readlines()]
            for lst in lines:
                registration_number = lst[3].strip()
                coordinate_type = lst[5].strip()
                latitude_direction = lst[9].strip()
                latitude_total_seconds = lst[10].strip()
                longitude_direction = lst[14].strip()
                longitude_total_seconds = lst[15].strip()
                if registration_number and\
                   latitude_total_seconds and\
                   longitude_total_seconds and\
                   coordinate_type == 'T':
                    latitude = coordinateConvert(latitude_direction,
                                                 latitude_total_seconds)
                    longitude = coordinateConvert(longitude_direction,
                                                  longitude_total_seconds)
                    co_map[registration_number] = {
                                'longitude': longitude,
                                'latitude': latitude
                            }

        ra_map = dict()
        ra_path = f'{tempdir}/RA.dat'
        with open(ra_path, encoding='ISO-8859-15') as fread:
            lines = [line.split('|') for line in fread.readlines()]
            for lst in lines:
                if len(lst) <= 8:
                    continue
                registration_number = lst[3].strip()
                system_identifier = lst[4].strip()
                status_code = lst[8].strip()
                n = len(lst)
                structure_type = '' if n <= 32 else lst[32].strip()
                overall_height_above_ground = '' if n <= 30 else lst[30].strip()
                height_without_appurtenaces = '' if n <= 28 else lst[28].strip()
                if registration_number:
                    ra_map[registration_number] = {
                        'status_code': status_code,
                        'structure_type': structure_type,
                        'system_identifier': system_identifier,
                        'overall_height_above_ground': overall_height_above_ground,
                        'height_without_appurtenaces': height_without_appurtenaces
                        }

        en_map = dict()
        en_path = f'{tempdir}/EN.dat'
        with open(en_path, encoding='ISO-8859-15') as fread:
            lines = [line.split('|') for line in fread.readlines()]
            for lst in lines:
                if len(lst) <= 10:
                    continue
                registration_number = lst[3].strip()
                owner_name = lst[9].strip()
                if registration_number and owner_name:
                    en_map[registration_number] = {
                        'owner_name': owner_name
                        }
        TASK_LOGGER.info('    DONE: Mapping CO.dat & RA.dat & EN.dat\n')
    return {'co_map': co_map, 'ra_map': ra_map, 'en_map': en_map}

def outputTowerGeo(properties):
    TASK_LOGGER.info('STEP 4. Export Tower Locator GeoJson')
    features = []
    for prop in properties:
        if set(['latitude', 'longitude', 'system_identifier']).issubset(prop.keys()):
            # Believe it or not, junk data exists
            longitude = prop['longitude']
            latitude = prop['latitude']
            system_identifier = prop['system_identifier']
            status_code = prop.get('status_code', 'UNKN')
            structure_type = prop.get('structure_type', 'UNKN')
            x = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [longitude, latitude]
                        },
                    'properties': {
                        **prop,
                        'structure_type': TYPE_MAP[structure_type] if structure_type in TYPE_MAP else structure_type,
                        'fcc_url': getTowerUrl(system_identifier),
                        'status': STATUS_CODES[status_code]
                    }
                }

            features.append(x)
    result = {
            'type': 'FeatureCollection',
            'features': features
            }

    if settings.PROD:
        TASK_LOGGER.info('    a. updating s3 bucket(isptoolbox-towerlocator)')
        contents = json.dumps(result).encode()
        file_obj = ContentFile(contents)
        output_path = ASR_S3_PATH
        s3storage = S3ManifestStorage()
        s3storage.save(output_path, file_obj)

        TASK_LOGGER.info('    ----a is finshed')
        TASK_LOGGER.info('    b. updating mapbox layer')
        try:
            # why
            overlay_geojson = getOverlayFromS3(ASR_S3_PATH)
            resp, data = uploadNewTileset(overlay_geojson, ASR_MAPBOX_OVERLAY)
            if resp.status_code == 201:
                sendEmailToISPToolboxOncall(
                    f'[Automated Message] Succesfully created updated overlay: {ASR_MAPBOX_OVERLAY}',
                    f'Updated overlay in mapbox {ASR_MAPBOX_OVERLAY}')
            else:
                sendEmailToISPToolboxOncall(
                    f'[Automated Message] Failed to update Overlay: {ASR_MAPBOX_OVERLAY}',
                    f'Failed to update overlay: {ASR_MAPBOX_OVERLAY}\nresp: {resp.status_code}\n' +
                    f'data:\n {json.dumps(data)}')
        except Exception as e:
            sendEmailToISPToolboxOncall(
                f'[Automated Message] Failed to update Overlay {ASR_MAPBOX_OVERLAY}',
                f"""Failed to update overlay: {ASR_MAPBOX_OVERLAY}\n
                exception: {str(e)}\n
                traceback:\n{traceback.format_exc()}""")
        TASK_LOGGER.info('    ----b is finshed')
    TASK_LOGGER.info('    DONE: Export Tower Locator GeoJson\n')


def update_asr_towers():
    mtime = getTimestampOfUpdate()
    source = Source.objects.get_or_create(source_id='ASR', source_country='US')

    if source[0].last_updated:
        source_last_updated = datetime.combine(source[0].last_updated, datetime.min.time())
    else:
        source_last_updated = None

    if not source_last_updated or mtime > source_last_updated:
        TASK_LOGGER.info('Start to generate Tower Locator GeoJson')
        TASK_LOGGER.info(f'retrieve data from FCC ({FCC_DATA_URL})')
        data_map = retrieveDataMaps()
        co_map = data_map['co_map']
        ra_map = data_map['ra_map']
        en_map = data_map['en_map']

        properties = []
        for key in co_map.keys():
            properties.append({
                    **co_map.get(key, {}),
                    **ra_map.get(key, {}),
                    **en_map.get(key, {}),
                    'registration_number': key
                    })
        outputTowerGeo(properties)

        source[0].last_updated = mtime
        source[0].save()

        TASK_LOGGER.info(f'Updated to {mtime}')
