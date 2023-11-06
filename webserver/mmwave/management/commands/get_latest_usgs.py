# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.core.management.base import BaseCommand
from mmwave.scripts.load_lidar_boundaries import loadBoundariesFromEntWine
from mmwave.tasks import updateLidarMetaData
from mmwave.models import EPTLidarPointCloud
from django.contrib.gis.geos import GEOSGeometry


class Command(BaseCommand):
    def handle(self, *args, **options):
        try:
            self.stdout.write('Getting latest usgs lidar dataset outlines')
            new_clouds = loadBoundariesFromEntWine(False, False)
            self.stdout.write(
                f'Successfully loaded {len(new_clouds)} point clouds')
            updateLidarMetaData()
            self.stdout.write('Creating Default Brazil EPT - Sao Paulo')
            sao_paulo = EPTLidarPointCloud(
                name="metadados-MDS",
                count=31730305220,
                url="https://ept-m3dc-pmsp.s3-sa-east-1.amazonaws.com/ept.json",
                srs=31983,
                boundary=GEOSGeometry("""
                    { "type": "Polygon", "coordinates":
                    [ [ [ -46.829103240847637, -24.011338118069098 ],
                        [ -46.362317679259732, -24.011338118069098 ],
                        [ -46.362317679259732, -23.353661874740183 ],
                        [ -46.829103240847637, -23.353661874740183 ],
                        [ -46.829103240847637, -24.011338118069098 ]
                    ] ]
                }""")
            )
            sao_paulo.save()

        except Exception as e:
            self.stderr.write(str(e))
