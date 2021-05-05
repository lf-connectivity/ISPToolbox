from webserver.celery import celery_app as app
from dataUpdate.scripts.update_mlab import updateMlab
from dataUpdate.scripts.update_non_urban import update_community_connect


@app.task
def updateGISData():
    updateMlab()
    update_community_connect()
