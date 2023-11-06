# (c) Meta Platforms, Inc. and affiliates. Copyright
import webserver.settings as django_settings

broker_url = django_settings.CELERY_BROKER_URL
port = 5555
address = '0.0.0.0'
url_prefix = 'async'

print(f'flower starting: {address}:{port}')
