import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'deep_gis.settings_dev')

celery_app = Celery('deep_gis')
celery_app.config_from_object('django.conf:settings', namespace='CELERY')
celery_app.autodiscover_tasks()