from dataUpdate.config.credentials import PROD_GIS_DB, TEST_GIS_DB


def dbClient(prod=False):
    import psycopg2
    connectionDict = TEST_GIS_DB
    if prod:
        connectionDict = PROD_GIS_DB
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
