# (c) Meta Platforms, Inc. and affiliates. Copyright
## DO NOT USE FOR PRODUCTION - only for local dev testing
watchmedo auto-restart --directory=./ --pattern=*.py --recursive -- celery --app celery_async worker --loglevel=info