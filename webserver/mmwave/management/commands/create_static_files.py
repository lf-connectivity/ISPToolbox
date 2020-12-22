from django.core.management.base import BaseCommand
from mmwave.scripts.load_lidar_boundaries import createInvertedOverlay


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating Lidar Availability Overlay')
        try:
            createInvertedOverlay()
            self.stdout.write('Successfully created lidar availability file')
        except Exception as e:
            self.stderr.write(str(e))
