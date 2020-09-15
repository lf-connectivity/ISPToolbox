#!/bin/bash
DJANGO_SETTINGS_MODULE=webserver.settings_prod gunicorn webserver.wsgi --bind :8020 -w 6