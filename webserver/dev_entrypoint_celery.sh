## DO NOT USE FOR PRODUCTION - only for local dev testing
watchmedo auto-restart --directory=./ --pattern=*.py --recursive -- celery --app webserver worker --loglevel=info