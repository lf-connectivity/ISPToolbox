# (c) Meta Platforms, Inc. and affiliates. Copyright
def create_initial_sources():
    from dataUpdate.models import Source
    from datetime import date

    nov_2020 = date.fromisoformat("2020-11-06")
    mlabus = Source.objects.get_or_create(
        source_id="MLAB", source_country="US", last_updated=nov_2020
    )
    mlabca = Source.objects.get_or_create(
        source_id="MLAB", source_country="CA", last_updated=nov_2020
    )
    mlabus[0].save()
    mlabca[0].save()
    print("Created sample source objects, done!")


create_initial_sources()
