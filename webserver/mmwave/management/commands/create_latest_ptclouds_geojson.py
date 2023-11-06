# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.core.management.base import BaseCommand
from mmwave.lidar_utils.show_latest_pt_clouds import createNewPointCloudAvailability


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Getting latest usgs lidar dataset outlines')
        try:
            path = createNewPointCloudAvailability()
            self.stdout.write(f'Successfully create geojson in S3 {path}')
        except Exception as e:
            self.stderr.write(str(e))
