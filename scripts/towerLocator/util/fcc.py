# noqa: E501
import tempfile
from zipfile import ZipFile
import shutil
import urllib.request as request
from contextlib import closing
from util.constants import FCC_DATA_URL


def coordinateConvert(direction, seconds):
    flag = 1 if direction in ('N', 'E') else -1
    return round(flag * float(seconds) / 3600, 6)


def retrieveDataMaps():
    print('STEP 1. Downloading FCC Data')
    with tempfile.TemporaryDirectory() as tempdir:
        zip_file = f'{tempdir}/fccTower'
        with closing(request.urlopen(FCC_DATA_URL)) as fsftp:
            with open(zip_file, 'wb') as fzip:
                shutil.copyfileobj(fsftp, fzip)
            print('    DONE: Downloading FCC Data\n')
            print('STEP 2. Extract Files')
            with ZipFile(zip_file, 'r') as zipfile:
                zipfile.extractall(tempdir)
            print('    DONE: Extract Files\n')
        print('STEP 3. Mapping CO.dat & RA.dat')
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
                status_code = lst[8].strip()
                n = len(lst)
                structure_type = '' if n <= 32 else lst[32].strip()
                overall_height_above_ground = '' if n <= 30 else lst[30].strip()
                height_without_appurtenaces = '' if n <= 28 else lst[28].strip()
                if registration_number and status_code in ('C', 'G'):
                    ra_map[registration_number] = {
                        'status_code': status_code,
                        'structure_type': structure_type,
                        'overall_height_above_ground': overall_height_above_ground,
                        'height_without_appurtenaces': height_without_appurtenaces
                        }
        print('    DONE: Mapping CO.dat & RA.dat\n')
    return {'co_map': co_map, 'ra_map': ra_map}
