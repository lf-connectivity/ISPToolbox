import tempfile
from osgeo import gdal
import json
import logging
import os
from django.contrib.gis.geos import GEOSGeometry, WKBWriter


def convert_file_to_workspace_session(file):
    features = {}
    if file.name.endswith('.geojson') or file.name.endswith('.json'):
        features = json.load(file)
    elif file.name.endswith('.kml'):
        features = _convert_to_geojson(file, '.kml')
    elif file.name.endswith('.kmz'):
        features = _convert_to_geojson(file, '.kmz')
    return features


def flatten_geometry(geom: GEOSGeometry):
    wkb_w = WKBWriter()
    wkb_w.outdim = 2
    hgt = None
    if geom.geom_type == 'Point':
        hgt = geom.z
    return GEOSGeometry(wkb_w.write_hex(geom)), hgt


def _convert_to_geojson(file, file_type):
    features = {}
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            with open(os.path.join(tmp_dir, 'convert' + file_type), 'wb') as tmp_file_kml:
                tmp_file_kml.write(file.read())
                tmp_file_kml.flush()
                output_geojson = os.path.join(tmp_dir, 'convert' + '.geojson')
                gdal.UseExceptions()
                src_kml = gdal.OpenEx(tmp_file_kml.name)
                ds = gdal.VectorTranslate(
                    output_geojson, src_kml, format='GeoJSON', skipFailures=True)
                del ds
                _ = gdal.OpenEx(output_geojson)
                with open(output_geojson, 'r') as tmp_file_geojson:
                    features = json.load(tmp_file_geojson)
    except Exception as e:
        logging.error(e)
        raise e
    return features
