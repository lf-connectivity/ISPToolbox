import datetime
from storages.backends.s3boto3 import S3Boto3Storage
from mmwave.models import TGLink
import json
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from django.core.files.base import ContentFile


from workspace.utils.geojson_circle import createGeoJSONCircle
import logging
import tempfile
import csv
from webserver.celery import celery_app as app

LIMIT_M = 100_000
bucket_name = 'isptoolbox-export-file'


def create_filepath_engagement_data(date):
    return 'smap/' + date.strftime('%Y-%m-%d') + \
        ":isptoolbox-los-engagement.csv"


def flatten(t):
    return [item for sublist in t for item in sublist]


def create_los_engagement_data_dump():
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


@app.task
def create_los_engagemnet_csv():
    link_isp_map = []
    fieldnames = ['fbid', 'lat', 'lng', 'radius', 'created']
    # last_month = datetime.datetime.now() + datetime.timedelta(days=-30)
    for link in TGLink.objects.all():
        # Filter links that are too long
        try:
            dist = geopy_distance(
                lonlat(link.tx.x, link.tx.y), lonlat(link.rx.x, link.rx.y)).meters
            if dist < LIMIT_M:
                link_isp_map.append({'fbid': link.fbid, 'lng': link.tx.x,
                                    'lat': link.tx.y, 'radius': dist / 1000, 'created': link.created.strftime('%Y-%m-%d')})
                link_isp_map.append({'fbid': link.fbid, 'lng': link.rx.x,
                                    'lat': link.rx.y, 'radius': dist / 1000, 'created': link.created.strftime('%Y-%m-%d')})
            else:
                raise Exception(f'link too long {dist} m')
        except Exception as e:
            logging.error(e)
            logging.error('failed to convert link to intervention')
            logging.error(
                f'{((link.tx.x, link.tx.y),(link.rx.x, link.rx.y))}')

    with tempfile.NamedTemporaryFile('w', newline="") as tmp_file:
        writer = csv.DictWriter(tmp_file, fieldnames=fieldnames)
        writer.writeheader()
        for row in link_isp_map:
            writer.writerow(row)
        s3storage = S3Boto3Storage(bucket_name=bucket_name, location='')
        path = create_filepath_engagement_data(datetime.datetime.now())
        tmp_file.seek(0)
        with open(tmp_file.name, mode='r') as f:
            s3storage.save(path, ContentFile(f.read().encode('utf-8')))
