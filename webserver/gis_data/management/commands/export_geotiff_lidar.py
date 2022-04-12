import argparse
import logging
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry
from mmwave.lidar_utils.DSMTileEngine import DSMTileEngine
from mmwave.models import EPTLidarPointCloud


class Command(BaseCommand):
    help = 'Create geotiff export from input geojson'

    def add_arguments(self, parser):
        parser.add_argument('--geojson', type=str, nargs='?')
        parser.add_argument('--input_geojson', type=argparse.FileType('r'), nargs='?')
        parser.add_argument('output_geotiff', type=argparse.FileType('wb'))

    def handle(self, *args, **options):
        try:
            self.stdout.write('Creating geotiff export')
            geog = self.get_geojson(*args, **options)
            if geog is None:
                raise Exception("No input geometry added")
            self.stdout.write(geog.json)
            clouds = EPTLidarPointCloud.query_intersect_aoi(geog)
            logging.info(clouds)
            dte = DSMTileEngine(geog, clouds)
            dte.getDSM(options['output_geotiff'].name)

        except Exception as e:
            logging.exception(e)
            self.stderr.write(str(e))

    def get_geojson(self, *args, **options):
        if options.get('geojson'):
            return GEOSGeometry(options['geojson'])
        elif options.get('input_geojson'):
            return GEOSGeometry(options['input_geojson'].read())
        return None
