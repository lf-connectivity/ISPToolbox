from django.core.management.base import BaseCommand
from Overlay.models import Overlay


def create_sample_overlays():
    try:
        rdof = Overlay.objects.get_or_create(
            type='rdof',
            source_url="mapbox://alexychong.9r5cne0h",
            source_layer="auction_904_final_simplified-1qpgm7"
        )
        rdof[0].save()
        tower = Overlay.objects.get_or_create(
            type='tower',
            source_url="mapbox://victorleefb.9l1ok6po",
            source_layer="towerLocator-3rfxut"
        )
        tower[0].save()
        communityConnect = Overlay.objects.get_or_create(
            type='communityConnect',
            source_url="mapbox://alexychong.bp1lmhp5",
            source_layer="calculated-cc-speeds-shp-casfao"
        )
        communityConnect[0].save()
        cbrs = Overlay.objects.get_or_create(
            type='cbrs',
            source_url='mapbox://alexychong.19jj5ryk',
            source_layer='cbrs_shp-6wi1gs'
        )
        cbrs[0].save()
        return True
    except Exception:
        return False


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating default overlay objects')
        try:
            success = create_sample_overlays()
            if success:
                self.stdout.write('Successfully created overlay objects')
            else:
                self.stderr.write('failed to create overlay objects')
        except Exception as e:
            self.stderr.write(str(e))
