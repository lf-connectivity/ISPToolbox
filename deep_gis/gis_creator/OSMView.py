
from django.views import View
from django.contrib.gis.geos import GEOSGeometry
from mmWaveTasks.mmwave import getOSMNodes
from shapely.geometry import shape
import json
import logging
from django.http import JsonResponse

def filterByPolygon(nodes, polygon):
    buildings = {k:v for (k,v) in nodes.items() if (('tags' in v) and ('building' in v['tags']) and ('nodes' in v))}
    building_shapes = { k : shape({'type' : 'Polygon', "coordinates" : [[[nodes[n]['lon'], nodes[n]['lat']]  for n in b['nodes'] ]]}) for (k,b) in buildings.items()}
    return  {k:v for (k,v) in nodes.items() if k not in building_shapes or building_shapes[k].intersects(polygon)}

class OSMBuildingsView(View):
    def get(self, request):
        geojson = request.GET.get('geojson', '{}')
        exclude = request.GET.get('exclude', '{}')
        # Parse Geojsons
        includeGeom = shape(json.loads(geojson))
        excludeGeom = None
        try:
            excludeGeom = shape(json.loads(exclude))
        except:
            logging.info("No Exclude Defined")
        ## Compute BB's
        if includeGeom.geom_type == 'Polygon':
            includeGeom = [includeGeom]
        bbIncludes = [a.bounds for a in includeGeom]
        bbExclude = []
        if excludeGeom:
            bbExclude = [a.bounds for a in excludeGeom]
        ## Query OSM BB's
        osmInclude = [getOSMNodes(bbox) for bbox in bbIncludes]
        osmExclude = []
        if bbExclude:
            osmExclude = [getOSMNodes(bbox) for bbox in bbExclude]
        ## Filter and combine results
        # Filtering
        osmIncludeFiltered = [filterByPolygon(nodes, polygon) for nodes, polygon in zip(osmInclude, includeGeom)]
        osmExcludeFiltered = []
        if excludeGeom:
            osmExcludeFiltered = [filterByPolygon(nodes, polygon) for nodes, polygon in zip(osmExclude, excludeGeom)]

        nodesInclude = {}
        for inc in osmIncludeFiltered:
            nodesInclude.update(inc)
        nodesExclude = {}
        for exc in osmExcludeFiltered:
            nodesExclude.update(exc)
        nodes = { k : nodesInclude[k] for k in set(nodesInclude) - set(nodesExclude) }
        ## Get Buildings
        buildings = {k:v for (k,v) in nodes.items() if (('tags' in v) and ('building' in v['tags']) and ('nodes' in v))}
        ## Build Geojsons
        geometries = [{'type' : 'Polygon', "coordinates" : [[[nodesInclude[n]['lon'], nodesInclude[n]['lat']]  for n in b['nodes'] ]]} for (k,b) in buildings.items()]
        building_geometrycollection = {'type' : 'GeometryCollection', "geometries" : geometries} 

        # Respond
        return JsonResponse(building_geometrycollection)