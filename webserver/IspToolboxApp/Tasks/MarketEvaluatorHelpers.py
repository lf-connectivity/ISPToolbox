from django.db import connections
import logging
import json
from shapely.geometry import shape
from IspToolboxApp.Tasks.mmWaveTasks.mmwave import getOSMNodes
from zipfile import ZipFile
import tempfile
import os
import rasterio
import rasterio.features
import rasterio.warp
import defusedxml

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


############################
# KMZ PROCESSING FUNCTIONS #
############################

def createPipelineFromKMZ(file):
    # unzip KMZ file
    tempdir = tempfile.TemporaryDirectory()
    with ZipFile(file, 'r') as zipfile:
        zipfile.extractall(tempdir.name)
    kml_files = [_ for _ in os.listdir(tempdir.name) if _.endswith('.kml')]
    if len(kml_files) > 0:
        kmlfile = defusedxml.ElementTree.parse(os.path.join(tempdir.name, kml_files[0]))
        overlays = findChildrenContains(kmlfile.getroot(), 'groundoverlay')
        overlayProps = [getOverlayStats(o) for o in overlays]
        # covert rasters to GeometryField
        geometries_raster = createGeoJsonsFromCoverageOverlays(overlayProps, tempdir.name)
        # get polygons from KMZ
        geometries_polygon = createGeoJsonsFromKML(kmlfile)
        geometry_collection = {'type' : 'GeometryCollection', 'geometries' : geometries_raster + geometries_polygon}
        return geometry_collection
    else:
        return None
    
def findChildrenContains(element, subtag):
    """ Finds All children that contain subtag. subtag must be lowercase
    returns List or None if no subtags exist"""
    try:
        return list(filter(lambda e : subtag in e.tag.lower(), element.iter()) )
    except: 
        return []

def createGeoJsonsFromKML(kmlfile):
    polygons = findChildrenContains(kmlfile.getroot(), 'polygon')
    geom = [getPolygonCoords(p) for p in polygons]
    return geom
    
def getPolygonCoords(polygon):
    try:
        outerboundary = findChildrenContains(polygon, 'outerboundaryis')
        innerboundaries = findChildrenContains(polygon, 'innerboundaryis')
        outerboundaries = [convertBoundaryToCoordinates(b) for b in outerboundary]
        innerboundaries = [convertBoundaryToCoordinates(b) for b in innerboundaries]
        return {'type' : 'Polygon', 'coordinates' : outerboundaries + innerboundaries}
    except:
        return []

def convertBoundaryToCoordinates(boundary):
    coords_str = findChildrenContains(boundary, 'coordinates').text
    coord_tuples = coords_str.split()
    coord_tuples_split = [ t.split(',') for t in coord_tuples]
    coords = [float(x) for x in t for t in coord_tuples_split]
    # Remove Altitude Parameter to ensure database accepts
    coords = [ t[:2] for t in coords]
    return coords

def getOverlayStats(overlay):
    try:
        image = findChildrenContains(overlay, 'href')[0].text
        north = float(findChildrenContains(overlay, 'north')[0].text)
        south = float(findChildrenContains(overlay, 'south')[0].text)
        east = float(findChildrenContains(overlay, 'east')[0].text)
        west = float(findChildrenContains(overlay, 'west')[0].text)
        return {'image' : image, 'bb' : [north, east, south, west]}
    except:
        return None

def createGeoJsonsFromCoverageOverlays(overlays, root_directory):
    geometries = []
    for overlay in overlays:
        imgpath = os.path.join(root_directory, overlay['image'])
        bb = overlay['bb']
        with rasterio.open(imgpath) as r:
            mask = r.dataset_mask()
            raster_transform = rasterio.transform.from_bounds(bb[3], bb[2], bb[1], bb[0], r.width, r.height)
            for geom, val in rasterio.features.shapes(mask, transform=raster_transform):
                geometries.append(geom)

    return geometries