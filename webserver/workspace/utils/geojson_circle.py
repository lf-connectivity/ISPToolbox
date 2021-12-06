import math
import numpy

EARTH_RADIUS = 6371008.8


def destination(origin, distance, bearing):
    """
    Helper function to get location of point at distance, bearing from point
    distance
    """
    longitude1 = math.radians(origin[0])
    latitude1 = math.radians(origin[1])
    bearingRad = math.radians(bearing)
    radians = distance / (EARTH_RADIUS / 1000.0)

    latitude2 = math.asin(
        math.sin(latitude1) * math.cos(radians)
        + math.cos(latitude1) * math.sin(radians) * math.cos(bearingRad)
    )
    longitude2 = longitude1 + math.atan2(
        math.sin(bearingRad) * math.sin(radians) * math.cos(latitude1),
        math.cos(radians) - math.sin(latitude1) * math.sin(latitude2),
    )
    lng = math.degrees(longitude2)
    lat = math.degrees(latitude2)

    return [lng, lat]


def createGeoJSONCircle(center, radius, steps=64):
    """
    Helper function to create geojson for circle of constant radius

    center - latitude, longitude
    radius - km
    """
    coordinates = []
    for i in range(steps):
        coordinates.append(destination(center, radius, (i * -360) / steps))
    coordinates.append(coordinates[0])
    return {"type": "Polygon", "coordinates": [coordinates]}


def createGeoJSONSector(center, radius, start_bearing, end_bearing, steps=64):
    """
    Helper function to create geojson for sector of constant radius

    center - latitude, longitude
    radius - km
    """
    center_coords = [center[0], center[1]]
    coordinates = [center_coords]

    # If end_bearing is less than start_bearing, that means we go through 0.
    if end_bearing < start_bearing:
        start_bearing -= 360

    # Keep proportion of steps for sector, need at least 2 for end to get rendered
    # via linspace though
    num_steps = max(math.floor(steps * ((end_bearing - start_bearing) / 360)), 2)
    for bearing in numpy.linspace(start_bearing, end_bearing, num=num_steps):
        coordinates.append(destination(center, radius, bearing))
    coordinates.append(center_coords)
    return {"type": "Polygon", "coordinates": [coordinates]}
