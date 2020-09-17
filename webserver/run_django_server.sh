#!/bin/bash
DJANGO_SETTINGS_MODULE=webserver.settings_prod gunicorn webserver.wsgi --bind 0.0.0.0 -w 6