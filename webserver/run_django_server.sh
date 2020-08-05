#!/bin/bash
DJANGO_SETTINGS_MODULE=webserver.settings_prod gunicorn webserver.wsgi --bind :80 -w 6 --limit-request-line 0