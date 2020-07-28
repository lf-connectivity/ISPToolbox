import requests
from typing import List, Dict
import logging
import json

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
        buildings = list(filter(lambda x : ('tags' in x) and ('building' in x['tags']), responseObj['elements']))
        nodes = list(map(lambda x : x['nodes'], buildings))
        flat_nodes = [item for sublist in nodes for item in sublist]
        flat_nodes = list(set(flat_nodes))
        url = 'https://api.openstreetmap.org/api/0.6/nodes/?nodes=' + ','.join([str(i) for i in flat_nodes])
        response = requests.get(url, headers=headers)
        responseObj = response.json()['elements']
        nodes = {node['id'] : node for node in responseObj}
        geometries = [{'type' : 'Polygon', "coordinates" : [[[nodes[n]['lon'], nodes[n]['lat']]  for n in b['nodes'] ]]} for b in buildings]
        building_geometrycollection = {'type' : 'GeometryCollection', "geometries" : geometries} 

        return building_geometrycollection

    else :
        logging.info('Using ML Generated Footprints')
        return []