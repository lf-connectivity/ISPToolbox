from django.db import transaction
from django.contrib.gis.geos import Point
from turfpy import measurement

from webserver.celery import celery_app as app
from workspace import geojson_utils
from workspace.models import (
    WorkspaceMapSession,
    PointToPointLink,
    PointToPointLinkSerializer,
    AccessPointSector,
    AccessPointSectorSerializer,
    AccessPointLocation,
    AccessPointSerializer,
    CPELocation,
    CPESerializer,
    APToCPELink,
    APToCPELinkSerializer,
)
from workspace.models.model_constants import ModelLimits
from workspace.tasks.websocket_utils import sendMessageToChannel
from workspace.templatetags.address_format import reverse_geocoded_address_lines

import numpy

_AZIMUTH_BUFFER = 30
_DISTANCE_BUFFER = 0.5


@app.task
@transaction.atomic
def createSectorCPEFromLngLat(channel_id, request, user_id):
    session_id = request["session_id"]
    lng = request["lng"]
    lat = request["lat"]

    session = WorkspaceMapSession.objects.get(owner=user_id, uuid=session_id)
    location = Point(lng, lat)

    # Get PtPs intersecting point
    ptps = PointToPointLink.objects.filter(
        map_session=session, geojson__intersects=location
    )

    deleted_ptps = []
    cpe_points = []
    heights = []
    for ptp in ptps:
        print(ptp)
        if Point(ptp.geojson.coords[0]).intersects(location):
            cpe_points.append(Point(ptp.geojson.coords[1]))
            heights.append(ptp.radio0hgt)
            deleted_ptps.append(ptp)
        elif Point(ptp.geojson.coords[1]).intersects(location):
            cpe_points.append(Point(ptp.geojson.coords[1]))
            heights.append(ptp.radio1hgt)
            deleted_ptps.append(ptp)

    # Get heading/azimuth for new sector. Heading = average of bearings,
    bearings = []
    radii = []

    # TODO: wrappers around turfpy
    tower_turfpy = AccessPointSector._wrap_geojson(location.json)
    for point in cpe_points:
        point_turfpy = AccessPointSector._wrap_geojson(point.json)
        bearings.append(measurement.bearing(tower_turfpy, point_turfpy))
        radii.append(measurement.distance(tower_turfpy, point_turfpy))

    heading = numpy.mean(bearings) if bearings else ModelLimits.HEADING.default

    # Try to include every PtP CPE in the sector for azimuth, or default if too narrow.
    azimuth = max(
        ModelLimits.AZIMUTH.default,
        min(
            2 * max((abs(b - heading) for b in bearings), default=0) + _AZIMUTH_BUFFER,
            ModelLimits.AZIMUTH.max,
        ),
    )

    # Try to include every PtP CPE in the sector for distance, or default if too narrow.
    radius = max(
        ModelLimits.RADIUS.default,
        min(
            max(radii, default=0) + _DISTANCE_BUFFER,
            ModelLimits.RADIUS.max,
        ),
    )

    # Height = max of heights
    height = max(heights, default=ModelLimits.HEIGHT.default)

    # Create the objects
    tower = AccessPointLocation(
        owner=session.owner, map_session=session, geojson=location
    )
    tower.save()

    sector = AccessPointSector(
        owner=session.owner,
        map_session=session,
        ap=tower,
        heading=heading,
        azimuth=azimuth,
        radius=radius,
        height=height,
        uneditable=True,
    )
    sector.save()

    cpes = []
    links = []
    for cpe_point in cpe_points:
        lat = cpe_point.coords[1]
        lng = cpe_point.coords[0]
        name = reverse_geocoded_address_lines(lat, lng)[0]
        cpe = CPELocation(
            owner=session.owner,
            name=name,
            map_session=session,
            geojson=cpe_point,
            sector=sector,
        )
        cpe.save()

        link = APToCPELink(
            owner=session.owner,
            map_session=session,
            sector=sector,
            cpe=cpe,
            uneditable=True,
        )
        link.save()

        cpes.append(cpe)
        links.append(link)

    new_features = geojson_utils.merge_feature_collections(
        AccessPointSerializer.get_features_for_session(session, [tower]),
        AccessPointSectorSerializer.get_features_for_session(session, [sector]),
        CPESerializer.get_features_for_session(session, cpes),
        APToCPELinkSerializer.get_features_for_session(session, links),
    )

    deleted_features = PointToPointLinkSerializer.get_features_for_session(
        session, deleted_ptps
    )

    # Delete them last to preserve UUID return to user.
    for ptp in deleted_ptps:
        ptp.delete()

    sendMessageToChannel(
        channel_id,
        {
            "type": "cpe.sector_created",
            "deleted_features": deleted_features["features"],
            "added_features": new_features["features"],
        },
    )
