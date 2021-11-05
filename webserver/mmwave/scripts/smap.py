from mmwave.models import TGLink
from django.contrib.gis.geos import LineString, GeometryCollection
import json
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat

from workspace.utils.geojson_circle import createGeoJSONCircle
import logging

LIMIT_M = 100_000


def flatten(t):
    return [item for sublist in t for item in sublist]

link_isp_map = {}
for link in TGLink.objects.all():
    # Filter links that are too long
    try:
        dist = geopy_distance(
            lonlat(link.tx.x, link.tx.y), lonlat(link.rx.x, link.rx.y)).meters
        if dist < LIMIT_M:
            circ_tx = createGeoJSONCircle(link.tx, dist/1000)
            circ_rx = createGeoJSONCircle(link.rx, dist/1000)
            link_isp_map.update({link.fbid: link_isp_map.get(
                link.fbid, []) + [circ_rx, circ_tx]})
    except:
        logging.error('failed to convert link to intervention')
        logging.error(
            f'{(lonlat(link.tx.x, link.tx.y), lonlat(link.rx.x, link.rx.y))}')

feats = [[{'type': 'Feature', 'properties': {
    'fbid': -1 if id is None else id}, 'geometry': f} for f in id_feats] for id, id_feats in link_isp_map.items()]
geojson = {'type': 'FeatureCollection', 'features': flatten(feats)}

with open('/usr/src/app/data.json', 'w') as outfile:
    json.dump(geojson, outfile)
