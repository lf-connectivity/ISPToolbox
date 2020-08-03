#!/bin/bash
DJANGO_SETTINGS_MODULE=deep_gis.settings_prod gunicorn deep_gis.wsgi --bind :80 -w 6 --limit-request-line 0