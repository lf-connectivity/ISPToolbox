from mmwave.scripts.update_lidar_metadata import (
    update_lidar_metadata, alert_oncall_status
)
from webserver.celery import celery_app as app
from django.conf import settings


def updateLidarMetaData():
    results = update_lidar_metadata()
    if settings.PROD:
        alert_oncall_status(*results)


@app.task
def pull_latest_pointcloud_metadata():
    update_lidar_metadata()
