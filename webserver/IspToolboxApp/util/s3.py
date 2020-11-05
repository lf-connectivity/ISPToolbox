import logging
import boto3
from botocore.exceptions import ClientError
from django.conf import settings

bucket_name = 'isptoolbox-export-file'


def writeToS3(data, object_name):
    s3 = boto3.resource('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
    try:
        s3.Bucket(bucket_name).put_object(Key=object_name, Body=data)
    except Exception as e:
        logging.error(e)
        return False
    return True


def createPresignedUrl(object_name, expiration=300):
    client = boto3.client('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                          aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
    try:
        response = client.generate_presigned_url(
            'get_object', Params={'Bucket': bucket_name, 'Key': object_name}, ExpiresIn=expiration)
    except ClientError as e:
        logging.error(e)
        return None
    return response
