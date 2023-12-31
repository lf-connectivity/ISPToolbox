# (c) Meta Platforms, Inc. and affiliates. Copyright
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
            source_url='mapbox://isptoolbox.non_urban_overlay_MTS',
            source_layer='original'
        )
        communityConnect[0].save()
        cbrs = Overlay.objects.get_or_create(
            type='cbrs',
            source_url='mapbox://isptoolbox.cbrs_overlay_MTS',
            source_layer='original'
        )
        cbrs[0].save()
        censusBlocks = Overlay.objects.get_or_create(
            type='censusBlocks',
            source_url='mapbox://isptoolbox.census_blocks_with_ids',
            source_layer='censusblocks'
        )
        censusBlocks[0].save()
        tribal = Overlay.objects.get_or_create(
            type='tribal',
            source_url='mapbox://isptoolbox.414dhikj',
            source_layer='tl_2020_us_aiannh-4pkmr1'
        )
        tribal[0].save()
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
