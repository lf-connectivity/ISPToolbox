from celery import shared_task
from IspToolboxApp.Models.MarketingConvertModels import MarketingPinConversion
import datetime
import heapq
from django.contrib.gis.geos import Point, \
    GeometryCollection, LinearRing, Polygon, MultiPolygon
from shapely.ops import polylabel
from shapely import wkt

"""
Converting Polygons to Pins for Ads Manager
"""
arc_second_degrees = 1.0/60.0
radius_options = list(range(81))


def km2Buffer(km):
    return km / 40000.0 * 360.0


def shouldKeepMakingPins(heap, output, num_pins):
    return len(output) < num_pins and len(heap) > 0 and heap[0][0] < -0.0


def calcPinCost(coverage_area, center, radius_km):
    pin = createPin(radius_km, center)
    try:
        cost = coverage_area.sym_difference(pin).area
    except Exception as e:
        print(str(e))
        cost = float('inf')
    return (cost, pin, radius_km)


def createPin(radius_km, center):
    radius = km2Buffer(radius_km)
    pin = Point(center.x, center.y).buffer(radius)
    return pin


def findNextPinAdd(polygon):
    center = polylabel(wkt.loads(polygon.buffer(0).wkt), arc_second_degrees)
    pin_options = [calcPinCost(polygon, center, radius_km) for radius_km in radius_options]
    _, pin, radius_km = min(pin_options)
    return pin, radius_km


def removeOrConvertGeometry(geom):
    """
    Helper function to filter out GEOSGeometry.difference results
    """
    if geom.__class__ == GeometryCollection and geom.area > 0:
        return [g for g in geom]
    elif geom.__class__ == LinearRing:
        return [Polygon(geom)]
    elif geom.__class__ == Polygon:
        return [geom]
    elif geom.__class__ == MultiPolygon:
        return [g for g in geom]
    else:
        return []


def filterDifference(geometry_list):
    """
    Helper function to filter out GEOSGeometry.difference results
    """
    filtered = []
    for g in geometry_list:
        filtered += removeOrConvertGeometry(g)
    return filtered


def differenceIncludeExclude(include, exclude):
    coverage_area_polygons = []
    for include_p in include:
        coverage_area_polygon = include_p
        for exclude_p in exclude:
            if not coverage_area_polygon.valid:
                coverage_area_polygon = coverage_area_polygon.buffer(0)
            if not exclude_p.valid:
                exclude_p = exclude_p.buffer(0)
            try:
                coverage_area_polygon = coverage_area_polygon.difference(exclude_p)
            except Exception as e:
                print(str(e))
        coverage_area_polygons.append(coverage_area_polygon)
    return GeometryCollection(filterDifference(coverage_area_polygons))


def convertPolygonToPins(include, exclude, num_pins):
    """
    include - GeometryCollection
    exclude - GeometryCollection
    num_pins - maximum number of pins allowed to add
    """
    coverage_area = differenceIncludeExclude(include, exclude)
    if not coverage_area.valid:
        coverage_area = coverage_area.buffer(0)

    # algorithm
    # create queue of polygons
    polygon_heap = []
    for polygon in coverage_area:
        if polygon.__class__ == LinearRing:
            polygon = Polygon(polygon)
        polygon_heap.append((-polygon.area, polygon))
    heapq.heapify(polygon_heap)
    # create output queue of pins
    output_pins = []
    # didPinLimitHit = False
    output_msg = None
    # for each polygon in coverage area sorted by area:
    while shouldKeepMakingPins(polygon_heap, output_pins, num_pins):
        largest_polygon = heapq.heappop(polygon_heap)[1]
        # binary search pin size that produces the smallest pin difference
        pin, radius = findNextPinAdd(largest_polygon)
        if radius == 0:
            break
        output_pins.append((pin, radius))
        # subtract differnce and add to priority queue
        try:
            diff = largest_polygon.difference(pin)
        except Exception as e:
            print(str(e))
        if len(diff) > 1:
            for polygon in diff:
                heapq.heappush(polygon_heap, (-polygon.area, polygon))
        else:
            heapq.heappush(polygon_heap, (-diff.area, diff))
    if len(output_pins) == num_pins and len(polygon_heap) > 0:
        # didPinLimitHit = True
        output_msg = 'Pin limit reached'

    include_output_pins = GeometryCollection([p[0] for p in output_pins])
    return include_output_pins, output_msg


@shared_task
def ConvertPins(uuid):
    conversion = MarketingPinConversion.objects.get(uuid=uuid)
    try:
        # Convet Marketing Area to Pins
        include_output, msg = convertPolygonToPins(
            conversion.include,
            conversion.exclude,
            conversion.num_pins
        )
        conversion.include_output = include_output
        conversion.error = msg
        conversion.completed = datetime.datetime.now()
        conversion.save()
    except Exception as e:
        conversion.error = str(e)
        conversion.completed = datetime.datetime.now()
        conversion.save()
