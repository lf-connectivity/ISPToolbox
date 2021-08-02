import logging
import boto3
import botocore
from botocore.exceptions import ClientError
from django.conf import settings
import concurrent.futures

max_workers = 32


bucket_name = 'isptoolbox-export-file'
s3_resource = boto3.resource('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                             aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY)
s3_client = boto3.client('s3', aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                         aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                         config=botocore.config.Config(max_pool_connections=max_workers))


class S3PublicExportMixin():
    """
    This mixin is used for models associated with an s3 file in bucket 'isptoolbox-export-file'

    class must implement get_s3_key(self, **kwargs) -> str

    for latest details on bucket check aws console - as of writing it is private
    """
    bucket_name = bucket_name

    def delete_object(self, **kwargs):
        return deleteS3Object(self.get_s3_key(**kwargs), bucket_name=self.bucket_name)

    def write_object(self, data, **kwargs):
        return writeS3Object(self.get_s3_key(**kwargs), data, bucket_name=self.bucket_name)

    def read_object(self, fp, **kwargs):
        return readS3Object(self.get_s3_key(**kwargs), fp, bucket_name=self.bucket_name)

    def check_object(self, **kwargs):
        return checkObjectExists(self.get_s3_key(**kwargs), bucket_name=self.bucket_name)

    def create_presigned_url(self, **kwargs):
        return createPresignedUrl(self.get_s3_key(**kwargs), bucket_name=self.bucket_name)

    def get_s3_key(self, **kwargs):
        raise NotImplementedError


def writeS3Object(object_name, data, bucket_name=bucket_name):
    try:
        s3_resource.Bucket(bucket_name).put_object(Key=object_name, Body=data)
    except Exception as e:
        logging.error(e)
        return False
    return True


def deleteS3Object(key, bucket_name=bucket_name):
    try:
        s3_client.delete_object(Bucket=bucket_name, Key=key)
    except Exception as e:
        logging.error(e)
        return False
    return True


def createPresignedUrl(object_name, bucket_name=bucket_name, expiration=300):
    try:
        response = s3_client.generate_presigned_url(
            'get_object', Params={'Bucket': bucket_name, 'Key': object_name}, ExpiresIn=expiration)
    except ClientError as e:
        logging.error(e)
        return None
    return response


def readFromS3(object_name, fp, bucket_name=bucket_name):
    s3_client.download_fileobj(bucket_name, object_name, fp)


def readMultipleHelper(client, s3key, local_filename):
    return client.download_file(Filename=local_filename, Bucket=bucket_name, Key=s3key)


def readMultipleS3Objects(keys, filenames):
    with concurrent.futures.ThreadPoolExecutor(max_workers) as executor:
        future_to_url = {
            executor.submit(readMultipleHelper, s3_client, key, filename): key
            for key, filename in zip(keys, filenames)
        }
    for future in concurrent.futures.as_completed(future_to_url):
        try:
            future.result()
        except Exception:
            pass


def readS3Object(object_name, fp, bucket_name=bucket_name):
    s3_resource.Bucket(bucket_name).download_fileobj(object_name, fp)


def checkPrefixExists(prefix):
    try:
        for object in s3_resource.Bucket(bucket_name).objects.filter(Prefix=prefix):
            return True
        return False
    except ClientError:
        return False


def findPointCloudPrefix(prefix: str, name: str):
    """
    Use this method to find the production prefix of the point cloud tiles in s3
    """
    objs = s3_client.list_objects_v2(
        Bucket=bucket_name, Prefix=prefix, Delimiter='/')
    cloud = list(
        filter(lambda x: name in x['Prefix'], objs.get('CommonPrefixes', [])))
    if len(cloud) > 0:
        return cloud[0]['Prefix']
    return ''


def checkObjectExists(object_name, bucket_name=bucket_name):
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
