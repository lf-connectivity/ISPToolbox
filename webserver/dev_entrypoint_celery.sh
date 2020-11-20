## DO NOT USE FOR PRODUCTION - only for local dev testing
watchmedo auto-restart --directory=./ --pattern=*.py --recursive -- celery worker --beat -A webserver --loglevel=info