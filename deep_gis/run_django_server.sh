#!/bin/bash
gunicorn deep_gis.wsgi --bind :80 -w 6