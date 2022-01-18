from django.core.exceptions import ObjectDoesNotExist
from django.contrib.gis.geos import Point
from django.http.response import Http404
from django.shortcuts import render
from django.views import View
from enum import Enum
from rest_framework import generics

from gis_data.models import MsftBuildingOutlines
from workspace.models import (
    AccessPointSector,
    CPESerializer,
    WorkspaceMapSession,
    AccessPointCoverageBuildings,
)

import json


class _CoverageStatus(Enum):
    SERVICEABLE = "serviceable"
    UNSERVICEABLE = "unserviceable"
    UNKNOWN = "unknown"

    @staticmethod
    def update_overall_status(overall_status, new_status):
        if overall_status == _CoverageStatus.SERVICEABLE:
            return _CoverageStatus.SERVICEABLE
        elif overall_status == _CoverageStatus.UNSERVICEABLE:
            # unserviceable + serviceable -> serviceable
            # unserviceable + unserviceable -> unserviceable
            # unserviceable + unknown -> unknown
            return new_status
        else:
            # unknown + serviceable -> serviceable
            # unknown + unserviceable/unknown -> unknown
            if new_status == _CoverageStatus.SERVICEABLE:
                return _CoverageStatus.SERVICEABLE
            else:
                return _CoverageStatus.UNKNOWN


class CPETooltipMixin:
    in_range_template = "workspace/pages/cpe_in_range_location_form.html"
    out_of_range_template = "workspace/pages/cpe_out_of_range_location_form.html"

    def get_context_for_sector(self, sector):
        try:
            coverage = AccessPointCoverageBuildings.objects.get(sector=sector)
            status = _CoverageStatus(
                coverage.nearby_buildings.get(msftid=self.context["building_id"]).status
            )
        except ObjectDoesNotExist:
            status = _CoverageStatus.UNKNOWN

        return {
            "name": sector.name,
            "uuid": sector.uuid,
            "distance": sector.distance(self.lng_lat, units=self.units),
            "status": status.value,
        }

    def init_context(self, map_session, lng_lat):
        self.units = map_session.units
        self.lng_lat = json.loads(lng_lat)
        self.context = {}

        coordinates = self.lng_lat["coordinates"]
        self.context["lng"] = coordinates[0]
        self.context["lat"] = coordinates[1]
        self.context["session"] = map_session
        self.context["units"] = self.units

        # Check to see if there's a building intersecting the point
        location = Point(self.context["lng"], self.context["lat"])
        try:
            self.context["building_id"] = MsftBuildingOutlines.objects.get(
                geog__intersects=location
            ).id
        except ObjectDoesNotExist:
            self.context["building_id"] = -1

        # Calculate sectors intersecting point
        sectors = AccessPointSector.objects.filter(map_session=map_session)
        in_range = []
        for sector in sectors:
            if sector.intersects(self.lng_lat, units=self.units):
                in_range.append(self.get_context_for_sector(sector))

        self.context["sectors"] = sorted(in_range, key=lambda s: s["distance"])
        self.context["sector_ids"] = [
            sector["uuid"] for sector in self.context["sectors"]
        ]

        # Get overall coverage status
        status = _CoverageStatus.UNSERVICEABLE
        for sector in in_range:
            status = _CoverageStatus.update_overall_status(
                status, _CoverageStatus(sector["status"])
            )
        self.context["status"] = status.value

        # Get best sector to connect to - first serviceable in range sector, or
        # closest one if nothing is serviceable
        if in_range:
            if status == _CoverageStatus.SERVICEABLE:
                highlighted_sector = min(
                    [
                        sect
                        for sect in in_range
                        if sect["status"] == _CoverageStatus.SERVICEABLE.value
                    ],
                    key=lambda s: s["distance"],
                )
            else:
                highlighted_sector = in_range[0]
            self.context["highlighted_sector"] = highlighted_sector


class LocationTooltipView(View, CPETooltipMixin):
    def get(self, request, session_id, lng, lat):
        try:
            lng = float(lng)
            lat = float(lat)
        except ValueError:
            raise Http404

        session = WorkspaceMapSession.objects.get(owner=request.user, uuid=session_id)
        self.init_context(session, Point(lng, lat).json)
        if self.context["sectors"]:
            return render(request, self.in_range_template, self.context)
        else:
            return render(request, self.out_of_range_template, self.context)


class CPETooltipView(generics.GenericAPIView, CPETooltipMixin):
    serializer_class = CPESerializer
    lookup_field = "uuid"

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)

    def init_context(self, map_session, lng_lat):
        super().init_context(map_session, lng_lat)
        serializer = self.get_serializer(self.cpe)
        self.context["cpe"] = serializer.data.copy()

        # Highlighted sector and status should match status of CPE rooftop
        # only
        self.context["highlighted_sector"] = self.get_context_for_sector(
            self.cpe.sector
        )
        self.context["status"] = self.context["highlighted_sector"]["status"]

    def get(self, request, *args, **kwargs):
        self.cpe = self.get_object()
        self.init_context(self.cpe.map_session, self.cpe.geojson.json)
        return render(request, self.in_range_template, self.context)


class SwitchSectorTooltipView(LocationTooltipView):
    in_range_template = "workspace/pages/cpe_switch_sectors_form.html"
    out_of_range_template = "workspace/pages/cpe_switch_sectors_form.html"
