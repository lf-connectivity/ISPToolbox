import requests
import json
from mmwave.models import EPTLidarPointCloud
from django.contrib.gis.geos import GEOSGeometry


def getLidarResource():
    response = requests.get('https://usgs.entwine.io/boundaries/resources.geojson')
    response_content = json.loads(response.content)
    new_point_clouds = []
    for feat in response_content['features']:
        props = feat['properties']
        pt_cloud, created = EPTLidarPointCloud.objects.get_or_create(
            name=props['name'],
            id_num=props["id"],
            url=props['url'],
            count=props['count'],
            boundary=GEOSGeometry(json.dumps(feat['geometry'])),
            srs=3857
        )
        pt_cloud.save()
        if created:
            new_point_clouds.append(pt_cloud)
        print(props['name'])
    return new_point_clouds


if __name__ == "__main__":
    getLidarResource()
