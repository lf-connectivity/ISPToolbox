# (c) Meta Platforms, Inc. and affiliates. Copyright
from mmwave.scripts.update_lidar_metadata import (
    update_lidar_metadata, alert_oncall_status
)
from celery_async.celery import celery_app as app
from django.conf import settings
from mmwave.models import EPTLidarPointCloud
import redis
import time
from celery.utils.log import get_task_logger
from mmwave.scripts.create_dsm_for_ept import convertPtCloudToDSMTiled

logger = get_task_logger(__name__)


def updateLidarMetaData():
    results = update_lidar_metadata()
    if settings.PROD:
        alert_oncall_status(*results)


@app.task
def pull_latest_pointcloud_metadata():
    update_lidar_metadata()


@app.task
def tile_untiled_datasets():
    # Create connection to redis to check queue length and throttle
    url = settings.CELERY_BROKER_URL.replace('redis://', '')
    url = url.replace(':6379', '')
    r = redis.Redis(url)

    # Load all clouds and filter only those that are untiled
    clouds = EPTLidarPointCloud.objects.all()
    clouds = [(cld, cld.tiled) for cld in clouds]
    clouds = filter(lambda x: not x[1], clouds)
    idx = 0

    # Tile all clouds and throttle to not overrun redis queue length
    # and run out of memory
    for cloud, tiled in clouds:
        logger.info(f'cloud: {cloud.pk} {cloud.name} {idx}')
        idx = idx + 1
        convertPtCloudToDSMTiled.delay(cloud.pk)
        while (True):
            time.sleep(10)
            if r.llen('dsm') < 1000:
                break
