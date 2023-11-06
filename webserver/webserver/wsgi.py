# (c) Meta Platforms, Inc. and affiliates. Copyright
"""
WSGI config for deep_gis project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webserver.settings')

application = get_wsgi_application()
