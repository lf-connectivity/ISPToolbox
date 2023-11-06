# (c) Meta Platforms, Inc. and affiliates. Copyright
import requests
from typing import List, Dict
import logging
import time
import random


def getTreeRaster(areaOfInterest: List) -> Dict:
    return {}


def combineAreas(nodesInclude: List, nodesExclude: List) -> Dict:
    return {}


def splitBB(aoi: List) -> List:
    lons = [aoi[1], (aoi[3] + aoi[1]) / 2.0, aoi[3]]
    lats = [aoi[0], (aoi[2] + aoi[0]) / 2.0, aoi[2]]
    bbs = []
    for i in range(2):
        for j in range(2):
            bbs.append([lats[i], lons[j], lats[i + 1], lons[j + 1]])
    return bbs


def getOSMNodes(areaOfInterest: List) -> Dict:
    logging.info('Using OSM Generated Footprints')
    headers = {'Accept': 'application/json'}
    url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + \
        ','.join([str(i) for i in areaOfInterest])
    # Exponential Backoff
    backoff = 0
    while True:
        response = requests.get(url, headers=headers)
        nodes = {}
        if response.status_code == 400:
            # Exceeded 50,000 Nodes - errror codes / Time to Break Up this
            # Request and Merge
            splitBBoxes = splitBB(areaOfInterest)
            splitNodes = [getOSMNodes(bb) for bb in splitBBoxes]
            for bbnodes in splitNodes:
                nodes.update(bbnodes)
            break
        else:
            try:
                responseObj = response.json()
                nodes = {node['id']: node for node in responseObj['elements']}
                break
            except BaseException:
                logging.info(
                    'Hit OSM limit, using exponential backoff' + str(2**backoff))
                time.sleep(2**backoff + random.randint(0, 2))
                backoff += 1

    return nodes


def getAreaOfInterest(areaOfInterest: List, source: str = 'osm') -> Dict:
    """
    python : source - dataset to use
    """
    logging.info(areaOfInterest)
    if (source == "microsoft"):
        logging.info('Using Microsoft Footprints')
        return []

    elif (source == "osm"):
        logging.info('Using OSM Generated Footprints')
        headers = {'Accept': 'application/json'}
        url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + \
            ','.join([str(i) for i in areaOfInterest])
        response = requests.get(url, headers=headers)
        responseObj = response.json()
        buildings = list(
            filter(
                lambda x: (
                    'tags' in x) and (
                    'building' in x['tags']) and (
                    'nodes' in x),
                responseObj['elements']))
        nodes = {node['id']: node for node in responseObj['elements']}
        geometries = [{'type': 'Polygon', "coordinates": [
            [[nodes[n]['lon'], nodes[n]['lat']] for n in b['nodes']]]} for b in buildings]

        building_geometrycollection = {
            'type': 'GeometryCollection',
            "geometries": geometries}
        return building_geometrycollection

    else:
        logging.info('Using ML Generated Footprints')
        return []
