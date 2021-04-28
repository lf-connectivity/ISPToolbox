from webserver.celery import celery_app as app
from dataUpdate.scripts.update_mlab import updateMlab


@app.task
def updateGISData():
    updateMlab()
