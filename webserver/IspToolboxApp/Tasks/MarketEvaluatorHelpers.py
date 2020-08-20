from django.db import connections
import logging
import json
from shapely.geometry import shape
from IspToolboxApp.Tasks.mmWaveTasks.mmwave import getOSMNodes


def getUniqueBuildingNodes(nodes):
    buildings = {k: v for (k, v) in nodes.items() if (('tags' in v) and ('building' in v['tags']) and ('nodes' in v))}
    return buildings

def getAllNodes(nodes_list):
    nodes = {}
    for d in nodes_list:
        nodes.update(d)
    return nodes

def filterIncludeExclude(building_shape, include, exclude):
    overlaps_include = False
    for polygon in include:
        if polygon.intersects(building_shape):
            overlaps_include = True
            break
    if overlaps_include and exclude is not None:
        for polygon in exclude:
            if polygon.intersects(building_shape):
                overlaps_include = False
                break
    return overlaps_include


def filterBuildingNodes(building_shapes, include, exclude):
    buildings_shapely = [shape(v) for (k,v) in building_shapes.items()]
    matching_buildings = [k for (k,v) in building_shapes.items() if filterIncludeExclude(shape(v), include, exclude)]        
    return matching_buildings, building_shapes

def computeBBSize(bb):
    size = abs((bb[0] - bb[2]) * (bb[1] - bb[3]))
    return size

def getQueryTemplate(skeleton, addExclude, includeExclude):
    if addExclude:
        if includeExclude:
            return skeleton.format("St_intersects(geog, St_geomfromgeojson(%s)) AND St_intersects(geog, St_geomfromgeojson(%s))")
        else:
            return skeleton.format("St_intersects(geog, St_geomfromgeojson(%s)) AND NOT St_intersects(geog, St_geomfromgeojson(%s))")
    else:
        return skeleton.format("St_intersects(geog, St_geomfromgeojson(%s))")
def checkIfIncomeProvidersAvailable(include, exclude):
    switcher = {
        '60': False,
        '66': False,
        '69': False,
        '78': False,
    }
    return checkIfAvailable(include, exclude, switcher)


def checkIfPrecomputedAvailable(include, exclude):
    switcher = {
        '60': False,
        '66': False,
        '69': False,
        '78': False,
        '72': False,
    }
    return checkIfAvailable(include, exclude, switcher)


def checkIfAvailable(include, exclude, switcher): 
    resp = False

    with connections['gis_data'].cursor() as cursor:
        query_skeleton = "SELECT geoid FROM tl_2017_us_state WHERE {}"
        query_skeleton = getQueryTemplate(
            query_skeleton, exclude != None, True)
        cursor.execute(query_skeleton, [
                       include, exclude] if exclude != None else [include])
        for row in cursor.fetchall():
            if(switcher.get(row[0], True)):
                resp = True
                break
    return resp

def queryBuildingOutlines(include, exclude, callback = None):
    '''
    include - GEOSGeometry
    exclude - GEOSGeometry | None
    returns a dict {'error' : string | None, 'buildings' : List}
    '''
    include = include.geojson
    try:
        exclude = exclude.geojson
    except:
        logging.info("No Exclude Defined")
    # Check if Query is in US
    query_in_us = checkIfPrecomputedAvailable(include, exclude)
    if query_in_us:
        response = getMicrosoftBuildings(include, exclude, callback = callback)
    else:
        response = getOSMBuildings(include, exclude, callback = callback)
    return response

def getOSMBuildings(include, exclude, callback = None):
    '''
    include - string - a GeoJson String
    exclude - string | None - a GeoJSON string or type  None
    returns a dict {'error' : string | None, 'buildings' : Dict - GeometryCollection}
    '''
    
    includeGeom = shape(json.loads(include))
    excludeGeom = None
    if exclude != None:
        excludeGeom = shape(json.loads(exclude))

    response = {'error' : None, 'buildings': {"type": "GeometryCollection", "geometries": []}}
    try:
        # Compute BB's
        if includeGeom.geom_type == 'Polygon':
            includeGeom = [includeGeom]
        bbIncludes = [a.bounds for a in includeGeom]

        # Query OSM BB's
        if any(map(lambda x: computeBBSize(x) >= 0.25, bbIncludes)):
            response['error'] = "bounding box too large"
            return response

        osmInclude = [getOSMNodes(bbox) for bbox in bbIncludes]
        
        # Combine all nodes into dict
        allNodes = getAllNodes(osmInclude)
        logging.info('Finished pulling OSM data')

        # Combine all includes into unique building keys:
        buildingNodes = getUniqueBuildingNodes(allNodes)
        buildingDict = {k: {'type': 'Polygon', "coordinates": [[[allNodes[n]['lon'], allNodes[n]['lat']] for n in b['nodes']]]} for (k, b) in buildingNodes.items()}
        
        # Update Pipeline with Progress
        callback(len(buildingDict), {"type": "GeometryCollection", "geometries": [b for (k, b) in buildingDict.items()]})

        # Filter Buildings
        filteredBuildingsKeys, building_geojson_dict = filterBuildingNodes(buildingDict, includeGeom, excludeGeom)
        
        geometries = [building_geojson_dict[k] for k in filteredBuildingsKeys]
        response['buildings'] = {
            "type": "GeometryCollection",
            "geometries": geometries
        }
        
        return response

    except Exception as e:
        logging.info("OSM query failed")
        response['error'] = str(e)
        raise e

    return response

def getMicrosoftBuildings(include, exclude, callback = None):
    '''
    include - string - a GeoJson String
    exclude - string | None - a GeoJSON string or type  None
    returns a dict {'error' : string | None, 'buildings' : Dict GeometryCollection}
    '''

    response = {'error' : None, 'buildings' :  {"type": "GeometryCollection", "geometries": []}}
    try:
        with connections['gis_data'].cursor() as cursor:
            offset = 0
            buildings = []
            while True:
                print('executing_sql_query')
                print(offset)

                query_skeleton = "SELECT St_asgeojson(geog) FROM msftcombined WHERE {} LIMIT 10000 OFFSET %s;"
                query_skeleton = getQueryTemplate(
                    query_skeleton, exclude != None, False)
                cursor.execute(query_skeleton, [include, exclude, offset] if exclude != None else [include, offset])
                polygons = [json.loads(row[0]) for row in cursor.fetchall()]
                buildings += polygons
                offset += len(polygons)
                callback(offset, {"type": "GeometryCollection","geometries": buildings})
                if len(polygons) == 0:
                    break
            response['buildings'] = {
                "type": "GeometryCollection",
                "geometries": buildings
            }
            return response
    except Exception as e:
        logging.info("Failed to get buildings")
        response['error'] = str(e)
    return response

def getMicrosoftBuildingsOffset(include, exclude, offset):
    resp =  {"type": "GeometryCollection", "geometries": []}
    try:
        with connections['gis_data'].cursor() as cursor:
            query_skeleton = "SELECT St_asgeojson(geog) FROM msftcombined WHERE {} LIMIT 10000 OFFSET %s;"
            query_skeleton = getQueryTemplate(
                query_skeleton, exclude != None, False)
            cursor.execute(query_skeleton, [
                           include, exclude, offset] if exclude != None else [include, offset])
            polygons = [json.loads(row[0]) for row in cursor.fetchall()]
            resp =  {"type": "GeometryCollection", "geometries": polygons}
    except:
        resp =  {"type": "GeometryCollection", "geometries": []}
    return resp

