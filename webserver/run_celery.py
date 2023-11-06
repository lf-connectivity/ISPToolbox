# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.utils import autoreload


def run_celery():
    from webserver import celery_app

    celery_app.worker_main(["--beat", "--loglevel=info"])


print("Starting celery worker with autoreload...")
autoreload.run_with_reloader(run_celery)
