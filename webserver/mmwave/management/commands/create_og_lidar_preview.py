# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.core.management.base import BaseCommand
from mmwave.scripts.create_lidar_availability_preview import createOpenGraphPreviewImage
from datetime import date


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating Open Graph Preview for Latest Lidar Data')
        try:
            createOpenGraphPreviewImage(date.today())
        except Exception as e:
            self.stderr.write(str(e))
