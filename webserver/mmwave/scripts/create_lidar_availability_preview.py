import io
import requests
from django.conf import settings
from mmwave import models
import json
import logging
from PIL import Image
import tempfile
import os
from storages.backends.s3boto3 import S3Boto3Storage
import traceback
from datetime import date, timedelta


LOGO_RELATIVE_PATH = '/logo_composite.png'
OUTPUT_BUCKET = 'isptoolbox-static'
STYLE_AVAILABILITY_OVERLAY = "isptoolbox/ckqa072m86sgi18rzb7y2ak5k"
RESOLUTON = "1200x630"


def createOpenGraphPreviewImage(requested_date: date):
    """
    Create image of new LiDAR point clouds added for Open Graph Preview
    """
    current_month_first_day = requested_date.replace(day=1)
    last_day_of_prev_month = current_month_first_day - timedelta(days=1)
    new_clouds = models.EPTLidarPointCloud.objects.filter(
        date_time_added_to_isptoolbox__month=last_day_of_prev_month.month,
        date_time_added_to_isptoolbox__year=last_day_of_prev_month.year
    ).all()
    centroids = {
        "type": "Feature",
        "properties": {
            "marker-size": "s",
            "marker-color": "#9540ea",
            "fill-opacity": 0.5,
        },
        "geometry": {
            "type": "MultiPoint",
            "coordinates": [[cloud.boundary.centroid.x, cloud.boundary.centroid.y]for cloud in new_clouds]
        }
    }
    geojson = requests.utils.quote(json.dumps(centroids))
    response = requests.get(
        f"https://api.mapbox.com/styles/v1/{STYLE_AVAILABILITY_OVERLAY}/static/geojson({geojson})/auto/{RESOLUTON}" +
        f"?access_token={settings.MAPBOX_PUBLIC_TOKEN}"
    )
    if response.status_code == 200:
        with tempfile.TemporaryFile(suffix=".png") as tmp_file:
            tmp_file.write(response.content)

            # Put logo in top left of image
            preview_image = Image.open(tmp_file)
            dir_path = os.path.dirname(os.path.realpath(__file__))
            logo = Image.open(dir_path + LOGO_RELATIVE_PATH)
            preview_image.paste(logo)
            try:
                tmp_output = io.BytesIO()
                preview_image.save(tmp_output, format="jpeg")
                s3storage = S3Boto3Storage(bucket_name=OUTPUT_BUCKET, location='static/open-graph/')
                month = "{:02d}".format(current_month_first_day.month)
                path = f"{current_month_first_day.year}-{month}-latest-lidar-open-graph-preview.jpg"
                s3storage.save(path, tmp_output)
            except Exception as e:
                traceback.print_exc()
                logging.error(str(e))
    else:
        logging.error(str(response.status_code))
        logging.error(str(response.content))
        logging.error('Failed to get static image')
