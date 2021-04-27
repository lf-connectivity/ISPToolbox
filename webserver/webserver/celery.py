import os
from celery import Celery
from celery.schedules import crontab
from dataUpdate.scripts.update_mlab import updateMlab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webserver.settings')

# Sometimes autodiscover_tasks doesn't pick up all tasks.
# In this case add the path to the include param.
celery_app = Celery('webserver', include=['IspToolboxApp.tasks.MarketEvaluatorWebsocketTasks'])
celery_app.config_from_object('django.conf:settings', namespace='CELERY')
celery_app.autodiscover_tasks()
celery_app.conf.update(
    worker_pool_restarts=True,
)
# This setting is used to route dsm tasks to dsm workers only
celery_app.conf.task_routes = {
    'mmwave.scripts.*': {'queue': 'dsm'},
}


@celery_app.on_after_finalize.connect
def setup_periodic(sender, **kwargs):
    # Execute once at midnight on the first day of every month servertime (probably UTC)
    sender.add_periodic_task(crontab(minute=0, hour=0, day_of_month=[1]), updateGISData.s())


@celery_app.task
def updateGISData():
    updateMlab()
