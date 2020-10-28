def create_sample_overlays():
    from Overlay.models import Overlay

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
    print('Created sample overlay objects, done!')


create_sample_overlays()
