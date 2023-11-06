# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.core.management.base import BaseCommand
from isptoolbox_storage.mapbox.upload_tileset import uploadNewTileset
import argparse
import json


class Command(BaseCommand):
    help = 'Creates tileset in mapbox from geojson file'

    def add_arguments(self, parser):
        parser.add_argument('input_geojson', type=argparse.FileType('rb'))
        parser.add_argument('tileset', type=str)

    def handle(self, *args, **options):
        self.stdout.write('Creating tileset from json file')
        try:
            self.stdout.write(f"opening file {options['input_geojson'].name}...")
            resp, data = uploadNewTileset(options['input_geojson'], options['tileset'])
            self.stdout.write(f"data: {json.dumps(data)}")
            self.stdout.write(f"Status Code : {resp.status_code}")
            self.stdout.write(f"Uploaded new tileset {options['tileset']}")
        except Exception as e:
            self.stderr.write(str(e))
