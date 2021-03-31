"""
(  _  )(  _`\ ( ) ( )        ( ) ( )(_   _)(_)( )    (  _`\ 
| (_) || (_(_)| `\| | ______ | | | |  | |  | || |    | (_(_)
|  _  |`\__ \ | , ` |(______)| | | |  | |  | || |  _ `\__ \ 
| | | |( )_) || |`\ |        | (_) |  | |  | || |_( )( )_) |
(_) (_)`\____)(_) (_)        (_____)  (_)  (_)(____/'`\____)

Prove that your product is improving internet speeds.

Build up elasticsearch index of asns - so we can search by ISP owner / Company name

This is primarily US focused hence only ARIN
"""
import requests
import urllib.request
from datetime import datetime, timedelta
import tempfile
import io
import pandas as pd
import csv
import time
import json
from elasticsearch import Elasticsearch
from django.conf import settings

ASN_URL_PREFIX = 'https://rdap.arin.net/registry/autnum/'
ASN_LIST_URL = 'ftp://ftp.arin.net/pub/stats/arin/delegated-arin-extended-'


def loadAllActiveASNs():
    """
    Get all the latest ASNs from ARIN - american registry of internet numbers
    """
    yesterday = datetime.now() - timedelta(1)
    url = ASN_LIST_URL + datetime.strftime(yesterday, '%Y%m%d')

    request = urllib.request.Request(url)
    response = urllib.request.urlopen(request)
    data = response.read().decode('utf-8').splitlines()
    csv_list_asn = csv.reader(data, delimiter="|")
    asns = []
    for row in csv_list_asn:
        if row[2] == 'asn':
            try:
                asns.append(int(row[3]))
            except:
                pass
    return asns


def getASNInformation(asn):
    """
    Load ASN information from RDAP interface - http request
    """
    url = f'{ASN_URL_PREFIX}{asn}'
    
    response = requests.get(url)
    while response.status_code == 429:
        print(('failed', response.status_code, asn))
        time.sleep(3)
        response = requests.get(url)

    return response.json()


def updateASNElasticSearch(
        should_query_callback, result_json_callback, asn_error_callback):
    es = Elasticsearch(
        [settings.ES_ENDPOINT], http_auth=(settings.USERNAME_ES, settings.PASSWORD_ES)
    )
    asns = loadAllActiveASNs()
    for asn in asns:
        should_query = should_query_callback(asn)
        if should_query:
            success = False
            while not success:
                try:
                    asn_info = getASNInformation(asn)
                    convertVCardsHelper(asn_info)
                    res = es.index(index="test-index-asn", id=asn, body=asn_info)
                    # result_json_callback
                    print((asn, res))
                    success = True
                except Exception as e:
                    print(('Error!', asn, e))
                    asn_error_callback(asn, e)


def convertVCardsHelper(element):
    """
    VCards are basically a format for business cards - the asn RDAP returns jCards
    - the json equivalent, these do not get nicely injected by elasticsearch
    because of their variable format - thus we must convert any vcards to strings
    """
    if isinstance(element, dict):
        for key, value in element.items():
            if key == "vcardArray":
                element.update({
                    "vcardArray": json.dumps(value)
                })
            else:
                convertVCardsHelper(value)
    if isinstance(element, list):
        for value in element:
            convertVCardsHelper(value)


if __name__ == '__main__':
    updateASNElasticSearch(lambda x: True, None, lambda x,y: None)
