from mmwave.scripts.update_lidar_metadata import (
    update_lidar_metadata, alert_oncall_status
)
from celery.decorators import periodic_task
from celery.schedules import crontab
from django.conf import settings


def updateLidarMetaData():
    results = update_lidar_metadata()
    if settings.PROD:
        alert_oncall_status(*results)


if settings.PROD:
    @periodic_task(run_every=(crontab(minute=0, hour=20)), name="refresh_lidar_metadata")
    def pull_latest_pointcloud_metadata():
        update_lidar_metadata()
