import requests
from django.conf import settings
import json
import logging

ONCALL_NOTIFY_URL = 'https://www.facebook.com/isptoolbox/admin_alert/'
CSRF_SHIELD = 'for (;;);'


def sendEmailToISPToolboxOncall(title, body):
    """
        sends email to oncall+isptoolbox@xmail.facebook.com

            Parameters:
                title (str): string for title of the email
                body (str): string for the body of the email

    """
    headers = {
        'Authorization': f'Bearer {settings.SOCIAL_AUTH_FACEBOOK_KEY}|{settings.SOCIAL_AUTH_FACEBOOK_SECRET}'
    }
    data = {
        'app_id': settings.SOCIAL_AUTH_FACEBOOK_KEY,
        'title': title,
        'body': body,
    }
    try:
        response = requests.post(ONCALL_NOTIFY_URL, data=data, headers=headers)
        response_data = json.loads(response.content.decode().replace(CSRF_SHIELD, ''))
        return response_data['success']
    except Exception as e:
        logging.error(str(e))
        return False
