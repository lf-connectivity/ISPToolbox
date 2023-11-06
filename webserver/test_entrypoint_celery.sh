# (c) Meta Platforms, Inc. and affiliates. Copyright
## DO NOT USE FOR PRODUCTION - only for integration testing

# purge tasks before starting new one
python3 -m celery --app celery_async purge -f

# Test site customize
echo "import coverage" >  /opt/conda/lib/python3.8/site-packages/sitecustomize.py
echo "coverage.process_startup()" >>  /opt/conda/lib/python3.8/site-packages/sitecustomize.py

exec python3 -m celery --app celery_async worker --loglevel=info --pool=solo