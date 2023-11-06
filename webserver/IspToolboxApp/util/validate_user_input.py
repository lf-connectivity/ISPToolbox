# (c) Meta Platforms, Inc. and affiliates. Copyright
from area import area
from django.contrib.gis.geos import GEOSGeometry
import logging

MAXIMUM_NUM_COORDS = 1e6
MAXIMUM_SQ_MILES = 500


class InvalidMarketEvaluatorRequest(Exception):
    pass


def convertSqMetersToSqMiles(area):
    sq_meters_in_sq_mile = (1609.34 * 1609.34)
    return area / sq_meters_in_sq_mile


def validateUserInputMarketEvaluator(geometry):
    """
    Checks if the requested polygon from the user is valid

        Parameters: geometry (str) - geojson string

    raises: InvalidMarketEvaluatorRequest
    """
    geom = GEOSGeometry(geometry)
    num_coordinates = geom.num_coords
    if num_coordinates > MAXIMUM_NUM_COORDS:
        raise InvalidMarketEvaluatorRequest(
            f'Geometry too complex: {num_coordinates} coordinates - ' +
            f'limit {MAXIMUM_NUM_COORDS} coordinates. ' +
            'Try simplifying or splitting into multiple polygons.'
        )

    area_sq_miles = convertSqMetersToSqMiles(area(geometry))
    if area_sq_miles > MAXIMUM_SQ_MILES:
        raise InvalidMarketEvaluatorRequest(
            f'Geometry too large: {	"{:,.0f}".format(area_sq_miles)} sq miles - limit ' +
            f'{"{:,.0f}".format(MAXIMUM_SQ_MILES)} sq miles. ' +
            'Try requesting a smaller area or splitting up your request.'
        )


def computeAreaofInterestDistribution(qs):
    """
    Find out what the usage pattern of market evaluator looks like relative to this invalid request

    """
    areas = []
    points = []
    exceptions = []
    for me_request in qs:
        aoi = me_request.include_geojson.json
        areas.append(convertSqMetersToSqMiles(area(aoi)))
        points.append(me_request.include_geojson.num_coords)
        try:
            validateUserInputMarketEvaluator(me_request.include_geojson.json)
        except InvalidMarketEvaluatorRequest:
            exceptions.append(me_request)
        except Exception as e:
            logging.info(str(e))
    return {
        'areas': areas, 'num_points': points, 'exceptions': exceptions
    }
