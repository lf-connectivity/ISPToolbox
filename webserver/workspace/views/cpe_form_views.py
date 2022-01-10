from django.contrib.gis.geos import Point
from django.http.response import Http404
from django.shortcuts import render
from django.views import View
from enum import Enum
from rest_framework import generics

from workspace.models import AccessPointSector, CPESerializer, WorkspaceMapSession

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
        distance = sector.intersects(self.lng_lat, units=self.units)
        if distance is False:
            return None
        else:
            return {
                "name": sector.name,
                "uuid": sector.uuid,
                "distance": distance,
                # TODO: add status check by querying for building
                "status": _CoverageStatus.UNKNOWN.value,
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

        # Calculate sectors intersecting point
        sectors = AccessPointSector.objects.filter(map_session=map_session)
        in_range = []
        for sector in sectors:
            sector_context = self.get_context_for_sector(sector)
            if self.get_context_for_sector(sector):
                in_range.append(sector_context)

        self.context["sectors"] = sorted(in_range, key=lambda s: s["distance"])
        self.context["sector_ids"] = [
            sector["uuid"] for sector in self.context["sectors"]
        ]

        # Get overall coverage status
        status = _CoverageStatus.UNKNOWN
        for sector in in_range:
            status = _CoverageStatus.update_overall_status(status, sector["status"])
        self.context["status"] = status.value

        # Get best sector to connect to - first serviceable in range sector, or
        # closest one if nothing is serviceable
        if in_range:
            if status == _CoverageStatus.SERVICEABLE:
                highlighted_sector = min(
                    (
                        sect
                        for sect in in_range
                        if sect["status"] == _CoverageStatus.SERVICEABLE.value
                    ),
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


# TODO: test this after coding LocationTooltip
class CPETooltipView(generics.GenericAPIView, CPETooltipMixin):
    serializer_class = CPESerializer
    lookup_field = "uuid"

    def get(self, request, *args, **kwargs):
        return render(request, self.template)


class SwitchSectorTooltipView(LocationTooltipView):
    in_range_template = "workspace/pages/cpe_switch_sectors_form.html"
    out_of_range_template = "workspace/pages/cpe_switch_sectors_form.html"
