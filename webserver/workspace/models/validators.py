from django.contrib.gis.geos.geometry import GEOSGeometry
from django.contrib.gis.geos.linestring import LineString
from django.core.exceptions import ValidationError


def validate_zoom_level(zoom):
    if zoom <= 0:
        raise ValidationError('Zoom must be a positive number')
    elif zoom > 20:
        raise ValidationError('Zoom must be less than 20')


def validate_ptp_link_geometry(value: LineString):
    v = GEOSGeometry(value)
    if len(v) != 2:
        raise ValidationError('PtP Link consists of two points')
