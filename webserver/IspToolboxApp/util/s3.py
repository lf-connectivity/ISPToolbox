import logging
import boto3
import botocore
from botocore.exceptions import ClientError
from django.conf import settings

bucket_name = 'isptoolbox-export-file'
s3_resource = boto3.resource('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                             aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
s3_client = boto3.client('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                         aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)


class S3PublicExportMixin():
    """
    This mixin is used for models associated with an s3 file in bucket 'isptoolbox-export-file'

    class must implement get_s3_key(self, **kwargs) -> str

    for latest details on bucket check aws console - as of writing it is private
    """
    def delete_object(self, **kwargs):
        return deleteS3Object(self.get_s3_key(**kwargs))

    def write_object(self, data, **kwargs):
        return writeS3Object(self.get_s3_key(**kwargs), data)

    def read_object(self, fp, **kwargs):
        return readS3Object(self.get_s3_key(**kwargs), fp)

    def check_object(self, **kwargs):
        return checkObjectExists(self.get_s3_key(**kwargs))

    def create_presigned_url(self, **kwargs):
        return createPresignedUrl(self.get_s3_key(**kwargs))

    def get_s3_key(self, **kwargs):
        raise NotImplementedError


def writeS3Object(object_name, data):
    try:
        s3_resource.Bucket(bucket_name).put_object(Key=object_name, Body=data)
    except Exception as e:
        logging.error(e)
        return False
    return True


def deleteS3Object(key):
    try:
        s3_resource.Bucket(bucket_name).delete_object(Key=key)
    except Exception as e:
        logging.error(e)
        return False
    return True


def createPresignedUrl(object_name, expiration=300):
    try:
        response = s3_client.generate_presigned_url(
            'get_object', Params={'Bucket': bucket_name, 'Key': object_name}, ExpiresIn=expiration)
    except ClientError as e:
        logging.error(e)
        return None
    return response


def readFromS3(object_name, fp):
    s3_client.download_fileobj(bucket_name, object_name, fp)


def readS3Object(object_name, fp):
    s3_resource.Bucket(bucket_name).download_fileobj(object_name, fp)


def checkObjectExists(object_name):
    try:
        s3_resource.Object(bucket_name, object_name).load()
        return True
    except botocore.exceptions.ClientError as e:
        logging.error(e)
        if e.response['Error']['Code'] == "404":
            return False
        else:
            return False
    else:
        return True
