import requests
import boto3
from django.conf import settings


def uploadNewTileset(geojson_data, tileset_name):
    """
        https://docs.mapbox.com/api/maps/uploads/

        tileset_name has limitations, see link above for restrictions
    """
    try:
        # Get Upload Information
        params = [
            ('access_token', settings.MAPBOX_ACCESS_TOKEN_BACKEND),
        ]
        response = requests.post('https://api.mapbox.com/uploads/v1/isptoolbox/credentials', params=params)

        # Use Upload information to Write to S3
        upload_information = response.json()
        s3_client = boto3.client(
            's3',
            aws_access_key_id=upload_information['accessKeyId'],
            aws_secret_access_key=upload_information['secretAccessKey'],
            aws_session_token=upload_information['sessionToken']
        )
        s3_client.upload_fileobj(geojson_data, upload_information['bucket'], upload_information['key'])

        # Start the upload processing pipeline on mapbox's side
        headers = {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
        }

        params = (
            ('access_token', settings.MAPBOX_ACCESS_TOKEN_BACKEND),
        )

        data = {"url": upload_information['url'], "tileset": f"{settings.MAPBOX_ACCOUNT}.{tileset_name}"}
        response = requests.post('https://api.mapbox.com/uploads/v1/isptoolbox', headers=headers, params=params, json=data)

        return response.json()

        # Check if processing is complete

        # Update Overlay to Point to new endpoint
    except Exception as e:
        return str(e)
