import os
from celery import Celery
from celery.schedules import crontab
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webserver.settings')

# Sometimes autodiscover_tasks doesn't pick up all tasks.
# In this case add the path to the include param.
# TODO: move ISPToolboxApp tasks into python module w/ __init__.py and remove include keyword arg
celery_app = Celery('webserver', include=[
                    'IspToolboxApp.tasks.MarketEvaluatorWebsocketTasks'])
celery_app.config_from_object('django.conf:settings', namespace='CELERY')
celery_app.autodiscover_tasks()
celery_app.conf.update(
    worker_pool_restarts=True,
)
# This setting is used to route dsm tasks to dsm workers only
celery_app.conf.task_routes = {
    'mmwave.scripts.*': {'queue': 'dsm'},
}


# These are all the tasks we want to run periodically
@celery_app.on_after_finalize.connect
def setup_periodic(sender, **kwargs):
    import mmwave.tasks as mmwave_tasks
    import dataUpdate.tasks as dataUpdate_tasks
    if settings.PROD:
        # TODO: make jobs database backed with `django-celery-beat`
        sender.add_periodic_task(
            crontab(minute=0, hour=20),
            mmwave_tasks.pullLatestPointCloudsEntwine.s(),
            name="refresh_lidar_point_cloud"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=20),
            mmwave_tasks.addHighResolutionBoundaries.s(),
            name="add_high_resolution_boundary"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=0, day_of_month=[1]),
            mmwave_tasks.uploadBoundaryTilesetMapbox.s(),
            name="upload_boundary_tileset_mapbox"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=3, day_of_month=[1]),
            mmwave_tasks.createNewlyAddedCloudOverlay.s(),
            name="create_overlay_new_clouds"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=20),
            mmwave_tasks.pull_latest_pointcloud_metadata.s(),
            name="lidar_wesm_update"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=0),
            dataUpdate_tasks.updateAsrTowers.s(),
            name="update_asr_towers"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=0, day_of_month=[7]),
            dataUpdate_tasks.updateElasticSearchIndex.s(),
            name="update_elastic_search_asn"
        )
        # Execute once at midnight on
        # the first day of every month servertime - settings.py default timezone
        sender.add_periodic_task(
            crontab(minute=0, hour=0, day_of_month=[3]),
            dataUpdate_tasks.updateGISData.s(),
            name="update_gis_data"
        )
        sender.add_periodic_task(
            crontab(minute=0, hour=5, day_of_month=[1]),
            mmwave_tasks.create_los_engagemnet_csv.s(),
            name="los_engagement_csv"
        )
