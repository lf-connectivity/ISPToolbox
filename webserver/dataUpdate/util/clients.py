# (c) Meta Platforms, Inc. and affiliates. Copyright
from dataUpdate.config.credentials import TEST_GIS_DB
from django.conf import settings


def dbClient(prod=False):
    """
        Returns a psycopg2 connection for a database
        if prod == True: returns connection to the production database
        if prod == False: returns connection to the monthly update database
    """
    import psycopg2
    connectionDict = TEST_GIS_DB
    if prod:
        connectionDict = settings.DATABASES['gis_data']
    return psycopg2.connect(
        dbname=connectionDict['NAME'],
        user=connectionDict['USER'],
        password=connectionDict['PASSWORD'],
        host=connectionDict['HOST'],
        port=connectionDict['PORT']
        )


def bqClient():
    from google.cloud import bigquery
    return bigquery.Client()
