#!/bin/bash
DJANGO_SETTINGS_MODULE=webserver.settings_prod celery worker -A webserver --detach