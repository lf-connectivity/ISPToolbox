from celery.decorators import periodic_task
from django.conf import settings
from celery.schedules import crontab
from dataUpdate.scripts.load_asn_elasticsearch import updateASNElasticSearch
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall


ONCALL_ALERT_EMAIL_TITLE = "ASN Update Failed"

if settings.PROD:
    @periodic_task(run_every=(crontab(minute=0, hour=0, day_of_month=7)), name="update_elastic_search_asn")
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
