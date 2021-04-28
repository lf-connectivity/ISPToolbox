from dataUpdate.scripts.load_asn_elasticsearch import updateASNElasticSearch
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall
from webserver.celery import celery_app as app

ONCALL_ALERT_EMAIL_TITLE = "ASN Update Failed"


@app.task
def updateElasticSearchIndex():
    """
    Update elastic search indexes of ASN data regularly
    """
    try:
        updateASNElasticSearch(lambda x: True, None, lambda x, y: None)
    except Exception as e:
        sendEmailToISPToolboxOncall(
            ONCALL_ALERT_EMAIL_TITLE,
            str(e) + "Failed to update ASN elastic search index" + f" check {__file__}"
        )
