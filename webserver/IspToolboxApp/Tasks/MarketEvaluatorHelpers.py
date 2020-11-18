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
from defusedxml import ElementTree
from IspToolboxApp.templates.errorMsg import kmz_err_msg
from fastkml import kml as fastkml, styles
from fastkml.geometry import Geometry


# Mapping for Canadian broadband tech to US tech codes used on FE (WispCompetitorModal.react.js)
CA_TECHCODES = {
    'No Local Access': -1,
    'Mobile Wireless': 0,
    'High Capacity Transport Services': 0,
    'DSL': 10,
    'Coaxial Cable': 40,
    'Fibre to the home': 50,
    'Satellite': 60,
    'Fixed Wireless': 70,
}


def getUniqueBuildingNodes(nodes):
    buildings = {k: v for (k, v) in nodes.items() if (
        ('tags' in v) and ('building' in v['tags']) and ('nodes' in v))}
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
    matching_buildings = [
        k for (
            k,
            v) in building_shapes.items() if filterIncludeExclude(
            shape(v),
            include,
            exclude)]
    return matching_buildings, building_shapes


def computeBBSize(bb):
    size = abs((bb[0] - bb[2]) * (bb[1] - bb[3]))
    return size


def getQueryTemplate(skeleton, addExclude, includeExclude):
    if addExclude:
        if includeExclude:
            return skeleton.format(
                "St_intersects(geog, St_geomfromgeojson(%s)) AND St_intersects(geog, St_geomfromgeojson(%s))")
        else:
            return skeleton.format(
                "St_intersects(geog, St_geomfromgeojson(%s)) AND NOT St_intersects(geog, St_geomfromgeojson(%s))")
    else:
        return skeleton.format("St_intersects(geog, St_geomfromgeojson(%s))")


def checkIfPolyInCanada(include, exclude):
    '''
        Returns True if polygons overlap with Canada and False otherwise.
    '''
    return checkIfAvailable(include, exclude, {}, "ca_hex")


def checkIfIncomeProvidersAvailable(include, exclude):
    '''
        Checks if income data is available.  This could also use the standardized_subdivisions table
        if more granular exclusion is required.
    '''
    switcher = {
        '60': False,
        '66': False,
        '69': False,
        '78': False,
    }
    return checkIfAvailable(include, exclude, switcher, "standardized_prov_state")


def checkIfPrecomputedIncomeAvailable(include, exclude):
    '''
        Checks if we have more granular income data available for a more accurate computation (US Only)
    '''
    switcher = {
        '60': False,
        '66': False,
        '69': False,
        '78': False,
        '72': False,
    }
    return checkIfAvailable(include, exclude, switcher, "tl_2017_us_state")


def checkIfPrecomputedBuildingsAvailable(include, exclude):
    '''
        Checks if we have Microsoft rooftop data available as opposed to openstreetmaps which is lacking in some rural areas.
    '''
    switcher = {
        '60': False,
        '66': False,
        '69': False,
        '78': False,
        '72': False,
    }
    return checkIfAvailable(include, exclude, switcher, "standardized_prov_state")


def checkIfAvailable(include, exclude, switcher, table):
    resp = False

    with connections['gis_data'].cursor() as cursor:
        query_skeleton = "SELECT geoid FROM " + table + " WHERE {}"
        query_skeleton = getQueryTemplate(
            query_skeleton, exclude is not None, True)
        cursor.execute(query_skeleton, [
                       include, exclude] if exclude is not None else [include])
        for row in cursor.fetchall():
            if(switcher.get(row[0], True)):
                resp = True
                break
    return resp


def queryBuildingOutlines(include, exclude, callback=None):
    '''
    include - GEOSGeometry
    exclude - GEOSGeometry | None
    returns a dict {'error' : string | None, 'buildings' : List}
    '''
    include = include.geojson
    try:
        exclude = exclude.geojson
    except BaseException:
        logging.info("No Exclude Defined")
    # Check if Query is in US or Canada
    buildings_available = checkIfPrecomputedBuildingsAvailable(include, exclude)
    if buildings_available:
        response = getMicrosoftBuildings(include, exclude, callback=callback)
    else:
        response = getOSMBuildings(include, exclude, callback=callback)
    return response


def getOSMBuildings(include, exclude, callback=None):
    '''
    include - string - a GeoJson String
    exclude - string | None - a GeoJSON string or type  None
    returns a dict {'error' : string | None, 'buildings' : Dict - GeometryCollection}
    '''

    includeGeom = shape(json.loads(include))
    excludeGeom = None
    if exclude is not None:
        excludeGeom = shape(json.loads(exclude))

    response = {
        'error': None,
        'buildings': {
            "type": "GeometryCollection",
            "geometries": []}}
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
        buildingDict = {k: {'type': 'Polygon',
                            "coordinates": [[[allNodes[n]['lon'],
                                              allNodes[n]['lat']] for n in b['nodes']]]} for (k,
                                                                                              b) in buildingNodes.items()}

        # Update Pipeline with Progress
        callback(
            len(buildingDict), {
                "type": "GeometryCollection", "geometries": [
                    b for (
                        k, b) in buildingDict.items()]})

        # Filter Buildings
        filteredBuildingsKeys, building_geojson_dict = filterBuildingNodes(
            buildingDict, includeGeom, excludeGeom)

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


def getMicrosoftBuildings(include, exclude, callback=None):
    '''
    include - string - a GeoJson String
    exclude - string | None - a GeoJSON string or type  None
    returns a dict {'error' : string | None, 'buildings' : Dict GeometryCollection}
    '''

    response = {
        'error': None,
        'buildings': {
            "type": "GeometryCollection",
            "geometries": []}}
    try:
        with connections['gis_data'].cursor() as cursor:
            offset = 0
            buildings = []
            while True:
                query_skeleton = "SELECT St_asgeojson(geog) FROM msftcombined WHERE {} LIMIT 10000 OFFSET %s;"
                query_skeleton = getQueryTemplate(
                    query_skeleton, exclude is not None, False)
                cursor.execute(
                    query_skeleton, [
                        include, exclude, offset] if exclude is not None else [
                        include, offset])
                polygons = [json.loads(row[0]) for row in cursor.fetchall()]
                buildings += polygons
                offset += len(polygons)
                if callback:
                    callback(
                        offset, {
                            "type": "GeometryCollection", "geometries": buildings})
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


def getMicrosoftBuildingsOffset(include, offset):
    resp = {"gc": {"type": "GeometryCollection", "geometries": []}, "offset": 0}
    try:
        with connections['gis_data'].cursor() as cursor:
            query_skeleton = """
            WITH subdivided_request AS
            (SELECT ST_Subdivide(
                ST_GeomFromGeoJSON(%s), 32) as include_subdivide
            ),
            intersected_buildings AS
            (SELECT geog::geometry as geom, gid FROM msftcombined JOIN subdivided_request
            ON ST_intersects(subdivided_request.include_subdivide, geog)
                WHERE ST_intersects(subdivided_request.include_subdivide, geog) AND
                gid > %s
                ORDER BY gid ASC
                LIMIT 10000
            )
            SELECT MAX(gid) as gid, ST_asgeojson(ST_ForceCollection(ST_Collect(geom))) FROM intersected_buildings;
            """
            # query_skeleton = getQueryTemplate(
            #     query_skeleton, exclude is not None, False)
            cursor.execute(query_skeleton, [include, offset])
            db_resp = cursor.fetchone()
            resp = {"gc": json.loads(db_resp[1]), "offset": db_resp[0]}
    except BaseException:
        resp = {"gc": {"type": "GeometryCollection", "geometries": []}, "offset": 0}
    return resp


def caTechToTechCode(techArr):
    '''
        Converts Canadian tech descriptions (ex. Fixed Wireless, DSL, Fibre to home) to codes used on FE.
    '''
    return [CA_TECHCODES.get(tech, -1) for tech in techArr]


############################
# KMZ PROCESSING FUNCTIONS #
############################

def createPipelineFromKMZ(file):
    # unzip KMZ file
    with tempfile.TemporaryDirectory() as tempdir:
        with ZipFile(file, 'r') as zipfile:
            zipfile.extractall(tempdir)
        kml_files = [_ for _ in os.listdir(tempdir) if _.endswith('.kml')]
        geometries = []
        for kml in kml_files:
            kmlfile = ElementTree.parse(os.path.join(tempdir, kml))
            overlays = findChildrenContains(kmlfile.getroot(), 'groundoverlay')
            overlayProps = [getOverlayStats(o) for o in overlays]
            # covert rasters to GeometryField
            geometries_raster = createGeoJsonsFromCoverageOverlays(
                overlayProps, tempdir)
            # get polygons from KMZ
            geometries_polygon = createGeoJsonsFromKML(kmlfile)
            geometries += geometries_raster + geometries_polygon
        if not geometries:
            raise Exception(kmz_err_msg['no_geomtry'])
        geometry_collection = {
            'type': 'GeometryCollection',
            'geometries': geometries}
        return geometry_collection
    raise Exception(kmz_err_msg['parse_err'])


def findChildrenContains(element, subtag):
    """ Finds All children that contain subtag. subtag must be lowercase
    returns List or None if no subtags exist"""
    try:
        return list(filter(lambda e: subtag in e.tag.lower(), element.iter()))
    except BaseException:
        return []


def createGeoJsonsFromKML(kmlfile):
    polygons = findChildrenContains(kmlfile.getroot(), 'polygon')
    geom = [getPolygonCoords(p) for p in polygons]
    return geom


def getPolygonCoords(polygon):
    try:
        outerboundary = findChildrenContains(polygon, 'outerboundaryis')
        innerboundaries = findChildrenContains(polygon, 'innerboundaryis')
        outerboundaries = [
            convertBoundaryToCoordinates(b) for b in outerboundary]
        innerboundaries = [
            convertBoundaryToCoordinates(b) for b in innerboundaries]
        return {
            'type': 'Polygon',
            'coordinates': outerboundaries + innerboundaries}
    except:  # noqa: E722
        return {}


def convertBoundaryToCoordinates(boundary):
    def parseCoords(c):
        coords_str = c.text
        coord_tuples = coords_str.split()
        coord_tuples_split = [t.split(',') for t in coord_tuples]
        coords = [[float(x) for x in t] for t in coord_tuples_split]
        # Remove Altitude Parameter to ensure database accepts
        return [t[:2] for t in coords]
    coords = findChildrenContains(boundary, 'coordinates')
    if len(coords) > 0:
        return parseCoords(coords[0])
    else:
        return []


def getOverlayStats(overlay):
    try:
        image = findChildrenContains(overlay, 'href')[0].text
        north = float(findChildrenContains(overlay, 'north')[0].text)
        south = float(findChildrenContains(overlay, 'south')[0].text)
        east = float(findChildrenContains(overlay, 'east')[0].text)
        west = float(findChildrenContains(overlay, 'west')[0].text)
        return {'image': image, 'bb': [north, east, south, west]}
    except BaseException:
        return None


def createGeoJsonsFromCoverageOverlays(overlays, root_directory):
    geometries = []
    for overlay in overlays:
        imgpath = os.path.join(root_directory, overlay['image'])
        bb = overlay['bb']
        with rasterio.open(imgpath) as r:
            mask = r.dataset_mask()
            raster_transform = rasterio.transform.from_bounds(
                bb[3], bb[2], bb[1], bb[0], r.width, r.height)
            for geom, val in rasterio.features.shapes(
                    mask, transform=raster_transform):
                if val > 0:
                    geometries.append(geom)

    return geometries


############################
# KML PROCESSING FUNCTIONS #
############################


def getAllStyles():
    tag_styles = []
    for layer in ('shape', 'buildings'):
        s = styles.Style(id=f'{layer}-style-id')
        if layer == 'shape':
            s.append_style(styles.BalloonStyle())
            s.append_style(styles.LineStyle(color='50FF7800', width=5))
            s.append_style(styles.PolyStyle(color='50FF7800', fill=1))
        elif layer == 'buildings':
            s.append_style(styles.BalloonStyle())
            s.append_style(styles.LineStyle(color='ff06ff22', width=1))
            s.append_style(styles.PolyStyle(color='ff06ff22', fill=1))
        tag_styles.append(s)
    return tag_styles


def convertKml(geoList):
    tag_kml = fastkml.KML()
    ns = '{http://www.opengis.net/kml/2.2}'

    tag_styles = getAllStyles()

    tag_document = fastkml.Document(ns, styles=tag_styles)
    tag_kml.append(tag_document)

    tag_folder = fastkml.Folder(ns)
    tag_document.append(tag_folder)

    for layerGeoJson in geoList:
        layer = layerGeoJson['layer']
        geoData = layerGeoJson['geometries'] if 'geometries' in layerGeoJson else [layerGeoJson]
        for geo in geoData:
            tag_placemark = fastkml.Placemark(ns, name=layer, styleUrl=styles.StyleUrl(url=f'#{layer}-style-id'))
            tag_placemark.geometry = Geometry(ns, geometry=shape(geo))
            tag_folder.append(tag_placemark)

    return f'<?xml version="1.0" encoding="UTF-8"?>\n\
{tag_kml.to_string(prettyprint=True)}'
