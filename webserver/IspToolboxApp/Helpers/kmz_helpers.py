import tempfile
from zipfile import ZipFile
from defusedxml import ElementTree
import os
from workspace.models.model_constants import FeatureType
from shapely.geometry import shape
from IspToolboxApp.templates.errorMsg import kmz_err_msg
import rasterio
import rasterio.features
import rasterio.warp
from uuid import uuid4

from fastkml import kml as fastkml, styles
from fastkml.geometry import Geometry

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
    geom = []
    polygons = findChildrenContains(kmlfile.getroot(), 'polygon')
    geom += [getPolygonCoords(p) for p in polygons]
    points = findChildrenContains(kmlfile.getroot(), 'point')
    geom += [getPointCoords(p) for p in points]
    linestrings = findChildrenContains(kmlfile.getroot(), 'linestring')
    geom += [getLineStringCoords(line) for line in linestrings]
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


def getPointCoords(point):
    try:
        coords = findChildrenContains(point, 'coordinates')
        return {
            'type': 'Point',
            'coordinates': parseCoords(coords)
        }
    except Exception:
        return {}


def getLineStringCoords(linestring):
    try:
        coords = findChildrenContains(linestring, 'coordinates')
        return {
            'type': 'LineString',
            'coordinates': parseCoords(coords)
        }
    except Exception:
        return {}


def parseCoords(c):
    coords_str = c.text
    coord_tuples = coords_str.split()
    coord_tuples_split = [t.split(',') for t in coord_tuples]
    coords = [[float(x) for x in t] for t in coord_tuples_split]
    # Remove Altitude Parameter to ensure database accepts
    return [t[:2] for t in coords]


def convertBoundaryToCoordinates(boundary):
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
        geoData = layerGeoJson['geometries'] if 'geometries' in layerGeoJson else [
            layerGeoJson]
        for geo in geoData:
            tag_placemark = fastkml.Placemark(
                ns, name=layer, styleUrl=styles.StyleUrl(url=f'#{layer}-style-id'))
            tag_placemark.geometry = Geometry(ns, geometry=shape(geo))
            tag_folder.append(tag_placemark)

    return f'<?xml version="1.0" encoding="UTF-8"?>\n\
{tag_kml.to_string(prettyprint=True)}'


##############################
# AIRLINK Specific Functions #
##############################

def createWorkspaceSessionGeoJsonFromAirLinkKMZ(file):
    # unzip KMZ file
    with tempfile.TemporaryDirectory() as tempdir:
        with ZipFile(file, 'r') as zipfile:
            zipfile.extractall(tempdir)
        kml_files = [_ for _ in os.listdir(tempdir) if _.endswith('.kml')]
        features = []
        for kml in kml_files:
            features += parseKMLFile(kml, tempdir)
        if not features:
            raise Exception(kmz_err_msg['no_geomtry'])
        return features


def createWorkspaceSessionGeoJsonFromAirLinkKML(kml):
    kmlfile = ElementTree.parse(kml)
    return createAirlinkGeoJsonsFromKML(kmlfile.getroot())


def parseKMLFile(kml, dir):
    file = os.path.join(dir, kml)
    kmlfile = ElementTree.parse(file)
    overlays = findChildrenContains(kmlfile.getroot(), 'groundoverlay')
    overlayProps = [getOverlayStats(o) for o in overlays]
    # covert rasters to GeometryField
    geometries_raster = createGeoJsonsFromCoverageOverlays(
        overlayProps, dir)
    # get polygons from KMZ
    geometries_polygon = createAirlinkGeoJsonsFromKML(kmlfile.getroot())
    return geometries_raster + geometries_polygon


def createAirlinkGeoJsonsFromKML(kmlfile: ElementTree):
    """
    Parse KML looking for CPEs and APs to add to output feature list
    """
    ns = {
        'opengis': 'http://www.opengis.net/kml/2.2'
    }
    aps = kmlfile.findall(
        "opengis:Document/opengis:Folder[opengis:name='Site']", namespaces=ns)
    features = []
    for ap in aps:
        coords = ap.find(
            "opengis:Placemark/opengis:Point/opengis:coordinates", namespaces=ns)
        ap_coords = [float(c) for c in coords.text.split(',')]
        ap_uuid = uuid4()
        ap_feat = {
            'type': 'Point',
            'coordinates': ap_coords[0:2],
            'properties': {
                'height': ap_coords[2],
                'id': ap_uuid,
                'type': FeatureType.AP,
            }
        }
        features.append(ap_feat)

        cpes = ap.findall(
            "opengis:Folder[opengis:name='Station']/opengis:Placemark/opengis:Point/opengis:coordinates", namespaces=ns)
        for cpe in cpes:
            cpe_coords = [float(c) for c in cpe.text.split(',')]
            cpe = {
                'type': 'Point',
                'coordinates': cpe_coords[0:2],
                'properties': {
                    'height': cpe_coords[2],
                    'id': uuid4(),
                    'type': FeatureType.CPE,
                    'ap': ap_uuid
                }
            }
            features.append(cpe)
    return features
