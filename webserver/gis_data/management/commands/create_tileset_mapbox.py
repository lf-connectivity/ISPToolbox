# (c) Meta Platforms, Inc. and affiliates. Copyright
import argparse
import logging
from django.core.management.base import BaseCommand
from isptoolbox_storage.mapbox.upload_tileset import uploadNewTileset


class Command(BaseCommand):
    help = 'Create geotiff export from input geojson'

    def add_arguments(self, parser):
        parser.add_argument('--geojson', type=str, nargs='?')
        parser.add_argument('--input_geojson', type=argparse.FileType('rb'), nargs='?')
        parser.add_argument('--tileset_name', type=str)

    def handle(self, *args, **options):
        try:
            self.stdout.write(f'Creating tileset {options["tileset_name"]}')
            geog = self.get_geojson(*args, **options)
            if geog is None:
                raise Exception("No input geometry added")
            response, data = uploadNewTileset(geog, options['tileset_name'])
            self.stdout.write(str(response.status_code))
            self.stdout.write(str(data))
        except Exception as e:
            logging.exception(e)
            self.stderr.write(str(e))

    def get_geojson(self, *args, **options):
        if options.get('geojson'):
            return options['geojson']
        elif options.get('input_geojson'):
            return options['input_geojson']
        return None
