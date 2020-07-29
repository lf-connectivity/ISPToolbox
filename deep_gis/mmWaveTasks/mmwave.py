import requests
from typing import List, Dict
import logging
import json


def getTreeRaster(areaOfInterest: List) -> Dict:
    return {}

def combineAreas(nodesInclude : List, nodesExclude : List) -> Dict:
    return {}

def getOSMNodes(areaOfInterest: List) -> Dict:
    logging.info('Using OSM Generated Footprints')
    headers = {'Accept': 'application/json'}
    url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join([str(i) for i in areaOfInterest])
    response = requests.get(url, headers=headers)
    responseObj = response.json()
    nodes = {node['id'] : node for node in responseObj['elements']}
    return nodes
    
def getAreaOfInterest(areaOfInterest: List, source : str = 'osm') -> Dict:
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
        url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + ','.join([str(i) for i in areaOfInterest])
        response = requests.get(url, headers=headers)
        responseObj = response.json()
        buildings = list(filter(lambda x : ('tags' in x) and ('building' in x['tags']) and ('nodes' in x), responseObj['elements']))
        nodes = {node['id'] : node for node in responseObj['elements']}
        geometries = [{'type' : 'Polygon', "coordinates" : [[[nodes[n]['lon'], nodes[n]['lat']]  for n in b['nodes'] ]]} for b in buildings]

        building_geometrycollection = {'type' : 'GeometryCollection', "geometries" : geometries} 
        return building_geometrycollection

    else :
        logging.info('Using ML Generated Footprints')
        return []

