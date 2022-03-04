import tempfile
import shlex
import subprocess
import json
import logging
import os
from django.contrib.gis.geos import GEOSGeometry, WKBWriter


def convert_file_to_workspace_session(file):
    features = {}
    airlink = False
    if file.name.endswith('.geojson') or file.name.endswith('.json'):
        features = json.load(file)
        airlink = False
    elif file.name.endswith('.kml'):
        features, airlink = _convert_to_geojson(file, '.kml')
    elif file.name.endswith('.kmz'):
        features, airlink = _convert_to_geojson(file, '.kmz')
    return features, airlink


def flatten_geometry(geom: GEOSGeometry):
    wkb_w = WKBWriter()
    wkb_w.outdim = 2
    hgt = None
    if geom.geom_type == 'Point':
        hgt = geom.z
    return GEOSGeometry(wkb_w.write_hex(geom)), hgt


def _create_ogr2ogr_command(input, output):
    return shlex.split(f'ogr2ogr -skipfailures {output} {input} -lco RFC7946=YES -nln isptoolbox')


def _convert_to_geojson(file, file_type):
    features = {}
    airlink = False
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            with open(os.path.join(tmp_dir, 'convert' + file_type), 'wb') as tmp_file_kml:
                tmp_file_kml.write(file.read())
                tmp_file_kml.flush()
                output_geojson = os.path.join(tmp_dir, 'convert.json')
                command = _create_ogr2ogr_command(tmp_file_kml.name, output_geojson)
                subprocess.check_output(command, encoding="UTF-8", stderr=subprocess.STDOUT)
                with open(output_geojson, 'r') as tmp_file_geojson:
                    if "airLink" in tmp_file_geojson.read():
                        airlink = True
                    tmp_file_geojson.seek(0)
                    features = json.load(tmp_file_geojson)
    except Exception as e:
        logging.error(e)
        raise e
    return features, airlink
