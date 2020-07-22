#!/bin/bash
DJANGO_SETTINGS_MODULE=deep_gis.settings_prod
celery worker -A deep_gis --detach