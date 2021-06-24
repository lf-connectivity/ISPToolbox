import math
from django.contrib.gis.geos import GEOSGeometry, Polygon

BUFFER_TILE = 1.0 / 3600.0 / 6.0
DEFAULT_OUTPUT_ZOOM = 17


# tile utils: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
def deg2num(lat_deg: float, lon_deg: float, zoom: int) -> tuple:
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)


def num2deg(xtile: float, ytile: float, zoom: int) -> tuple:
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)


def getTiles(boundary: GEOSGeometry, zoom: int) -> list:
    tiles = []
    bb = boundary.extent
    xmin, ymin = deg2num(bb[3], bb[0], zoom)
    xmax, ymax = deg2num(bb[1], bb[2], zoom)
    for i in range(xmin, xmax + 1):
        for j in range(ymin, ymax + 1):
            tiles.append((i, j))
    return tiles


def getBoundaryofTile(x: int, y: int, z: int) -> Polygon:
    lat_max, lng_min = num2deg(x, y, z)
    lat_min, lng_max = num2deg(x+1, y+1, z)
    polygon = Polygon.from_bbox((lng_min, lat_min, lng_max, lat_max))
    polygon.srid = 4326
    return polygon


def addBufferToPolygon(polygon: Polygon, buffer=BUFFER_TILE) -> Polygon:
    if polygon.srid != 4236:
        return polygon.transform(4236, clone=True).buffer(buffer).transform(polygon.srid, clone=True)
    return polygon.buffer(buffer)
