from django.core.management.base import BaseCommand
from mmwave.scripts.load_lidar_boundaries import loadBoundariesFromEntWine


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Getting latest usgs lidar dataset outlines')
        try:
            new_clouds = loadBoundariesFromEntWine(False, False)
            self.stdout.write(f'Successfully loaded {len(new_clouds)} point clouds')
        except Exception as e:
            self.stderr.write(str(e))
