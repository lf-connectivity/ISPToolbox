from celery_async import celery_app as app
from dataUpdate.scripts.update_mlab import updateMlab
from dataUpdate.scripts.update_non_urban import update_community_connect
from dataUpdate.scripts.update_cbrs import updateCbrs
from dataUpdate.scripts.update_asr_towers import update_asr_towers


@app.task
def updateGISData():
    updateMlab()
    update_community_connect()
    updateCbrs()


@app.task
def updateMlabData():
    updateMlab()


@app.task
def updateCCData():
    update_community_connect()


@app.task
def updateCbrsData():
    updateCbrs()


@app.task
def updateAsrTowers():
    update_asr_towers()
