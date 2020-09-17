import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webserver.settings_dev')

celery_app = Celery('webserver')
celery_app.config_from_object('django.conf:settings', namespace='CELERY')
celery_app.autodiscover_tasks()
celery_app.conf.update(
    worker_pool_restarts=True,
)
