from celery import shared_task
from IspToolboxApp.Models.MarketingConvertModels import MarketingPinConversion
import datetime
import heapq
from django.contrib.gis.geos import Point, GeometryCollection
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
    cost = coverage_area.sym_difference(pin).area
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


def convertPolygonToPins(include, exclude, num_pins):
    """
    include - geojson or None
    exclude - geojson or None
    num_pins - maximum number of pins allowed to add
    """
    coverage_area = include.difference(exclude)
    # algorithm
    # create queue of polygons
    polygon_heap = []
    for polygon in coverage_area:
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
        diff = largest_polygon.difference(pin)
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
