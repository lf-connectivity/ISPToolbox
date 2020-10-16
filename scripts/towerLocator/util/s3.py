import boto3
import json
import time
from contextlib import closing


def writeToS3(data):
    s3 = boto3.resource('s3')
    data = json.dumps(data)
    unix = int(time.time())
    s3.Bucket('isptoolbox-towerlocator')\
        .put_object(Key=f'{unix}_towerLocator.json', Body=data)


def readFromS3():
    client = boto3.client('s3')
    response = client.list_objects(Bucket='isptoolbox-towerlocator')
    all_keys = [obj['Key'] for obj in response['Contents']]
    newest = max(all_keys)
    body = client.get_object(
            Bucket='isptoolbox-towerlocator',
            Key=newest
            )['Body']
    with closing(body) as stream:
        lst = [line.decode() for line in stream]
        return json.loads(''.join(lst))
