import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataUpdate.config.credentials import CLIENT_EMAIL, NOTIFY_EMAIL


# Sends notification email
def sendNotifyEmail(subject, text):
    contents = MIMEMultipart("alternative")
    contents["Subject"] = subject
    contents["From"] = CLIENT_EMAIL['EMAIL']
    contents["To"] = NOTIFY_EMAIL
    message = MIMEText(text, "plain")
    port = 465
    context = ssl.create_default_context()
    contents.attach(message)

    with smtplib.SMTP_SSL("smtp.gmail.com", port, context=context) as server:
        server.login(CLIENT_EMAIL['EMAIL'], CLIENT_EMAIL['PASS'])
        server.sendmail(CLIENT_EMAIL['EMAIL'], NOTIFY_EMAIL, contents.as_string())
