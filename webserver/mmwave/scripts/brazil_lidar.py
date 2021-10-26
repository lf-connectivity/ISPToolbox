from mmwave.models import EPTLidarPointCloud
from django.contrib.gis.geos import GEOSGeometry
import json
from mmwave.scripts.create_higher_resolution_boundaries import calculateEPTHighResolutionBoundary

# geojson = """
# { "type": "Polygon", "coordinates": [ [ [ -5205673.345976478420198, -2530855.386004233267158 ], [ -5288419.414916598238051, -2625901.695564361289144 ], [ -5244349.287960210815072, -2743576.052736178506166 ], [ -5106089.632899414747953, -2715437.970280839130282 ], [ -5125461.045091154053807, -2548331.921278963796794 ], [ -5205673.345976478420198, -2530855.386004233267158 ] ] ] }"""

# cld = EPTLidarPointCloud(
#     name="metadados-MDS",
#     count=31730305220,
#     url="https://ept-m3dc-pmsp.s3-sa-east-1.amazonaws.com/ept.json",
#     boundary=GEOSGeometry(geojson),
#     srs=31983,
# )
# cld.save()

cld = EPTLidarPointCloud.objects.get(name="metadados-MDS")
calculateEPTHighResolutionBoundary(cld)
print(cld.high_resolution_boundary)
