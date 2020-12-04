from IspToolboxApp.Tasks.mmWaveTasks.mmwave import getOSMNodes
from typing import List, Dict
from django.contrib.gis.geos import GEOSGeometry, LineString, Point
import logging


anchorInstitutions = ["school", "police", "townhall", "hospital", "fire_station"]


def isAnchorInstitution(element):
    """
    Helper Function to filter Anchor Institutions from OSM Nodes
    """
    try:
        tags = element.get('tags', {})
        if tags.get('amenity', '') in anchorInstitutions:
            return True
        return False
    except Exception:
        return False


def addCentroid(element: Dict, nodes: Dict):
    """
        Add latitude, longitude centroid to anchor institutions (osm ways elements)
    """
    if 'lat' in element or 'lon' in element:
        return element, Point((element['lon'], element['lat']))
    else:
        coordinates = [[nodes[x]['lon'], nodes[x]['lat']] for x in element['nodes']]
        linestr = LineString(coordinates)
        centroid = linestr.centroid
        element['lat'] = centroid[1]
        element['lon'] = centroid[0]
        return element, linestr


def fetchAnchorInstitutions(aoi: GEOSGeometry) -> List:
    """
    Calculates Anchor Institutions from OSM Nodes in Bounding Box
        Parameters:
                aoi : GEOSGeometry with valid extents to look for Anchor Institutions,
                    if too large exponetial backoff will make this function take a long time to compute

        Returns:
                osm_nodes (List): List of dicts, OSM nodes
    """
    try:
        bb = aoi.extent
        osm_nodes = getOSMNodes(bb)
        anchorInstitutions = list(filter(isAnchorInstitution, list(osm_nodes.values())))
        anchorInstitutions = [addCentroid(x, osm_nodes) for x in anchorInstitutions]
        anchorInstitutions = filter(lambda x: x[1].intersects(aoi), anchorInstitutions)
        anchorInstitutions = [x[0] for x in anchorInstitutions]
        return anchorInstitutions
    except Exception as e:
        logging.error('failed to find anchor institutions' + str(e))
        return []
