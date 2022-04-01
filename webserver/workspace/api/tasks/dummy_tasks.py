# Tasks only here to dummy test API framework. DEV ONLY

from celery_async import celery_app as app
import time


@app.task
def apiSleep(duration):
    time.sleep(duration)
    return f"Slept for {duration} seconds"
