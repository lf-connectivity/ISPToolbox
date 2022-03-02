from django.http.response import Http404
from django.views import View
from workspace.models import (
    AccessPointLocation,
    AccessPointCoverageBuildings,
    AccessPointSector
)
from workspace import pagination
from gis_data.models import MsftBuildingOutlines
from workspace.models import (
    AccessPointSerializer,
    CPESerializer,
    APToCPELinkSerializer,
    WorkspaceMapSessionSerializer,
    WorkspaceMapSession,
    CoverageAreaSerializer,
    Viewshed,
    PointToPointLinkSerializer,
    AccessPointSectorSerializer,
)
from rest_framework.permissions import AllowAny
from rest_framework import generics, mixins, renderers, filters
from django.http import JsonResponse
import logging
import json


class WorkspacePerformCreateMixin:
    """
    Mixin for REST Views to create new workspace models with foreign keys to the
    reuqest session or request user
    """

    def perform_create(self, serializer):
        session = None
        if self.request.session and self.request.session.session_key is not None:
            session = self.request.session.session_key
        user = self.request.user
        if self.request.user.is_anonymous:
            user = None
        serializer.save(owner=user, session_id=session)


class WorkspaceFeatureGetQuerySetMixin:
    """
    Mixin for REST Views to get the appropriate query set for the model
    using the request's user or session
    """

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)


# REST Views
class NetworkDetail(
    WorkspacePerformCreateMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    generics.RetrieveAPIView,
):
    permission_classes = [AllowAny]
    serializer_class = WorkspaceMapSessionSerializer

    def get_queryset(self):
        return WorkspaceMapSession.objects.filter(
            owner=self.request.user
        ) | WorkspaceMapSession.objects.filter(session=self.request.session)

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class SessionFilter(filters.BaseFilterBackend):
    """
    This filter allows LIST endpoints to filter based on map_session id
    """

    def filter_queryset(self, request, queryset, view):
        session = request.GET.get("session", None)
        if session is not None:
            return queryset.filter(map_session=session)
        else:
            return queryset


class AccessPointFilter(filters.BaseFilterBackend):
    """
    This filter allows LIST endpoints to filter based on ap uuid
    """

    def filter_queryset(self, request, queryset, view):
        ap = request.GET.get("ap", None)
        if ap is not None:
            return queryset.filter(ap=ap)
        else:
            return queryset


class AccessPointLocationListCreate(
    WorkspaceFeatureGetQuerySetMixin,
    WorkspacePerformCreateMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    generics.GenericAPIView,
):
    serializer_class = AccessPointSerializer
    permission_classes = [AllowAny]

    renderer_classes = [
        renderers.TemplateHTMLRenderer,
        renderers.JSONRenderer,
        renderers.BrowsableAPIRenderer,
    ]
    template_name = "workspace/molecules/access_point_pagination.html"

    pagination_class = pagination.IspToolboxCustomAjaxPagination

    filter_backends = [filters.OrderingFilter, SessionFilter]
    ordering_fields = ["name", "last_updated", "height", "max_radius"]
    ordering = ["-last_updated"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(
            {"ordering": self.request.GET.get("ordering", self.ordering[0])})
        return context

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AccessPointLocationGet(
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    WorkspaceFeatureGetQuerySetMixin,
    generics.GenericAPIView,
):
    serializer_class = AccessPointSerializer
    permission_classes = [AllowAny]
    lookup_field = "uuid"

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class CPELocationCreate(
    WorkspacePerformCreateMixin, mixins.CreateModelMixin, generics.GenericAPIView
):
    """
    On creation the height is modified to be relative to dsm
    """

    serializer_class = CPESerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class CPELocationGet(
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    WorkspaceFeatureGetQuerySetMixin,
    generics.GenericAPIView,
):
    serializer_class = CPESerializer
    permission_classes = [AllowAny]
    lookup_field = "uuid"

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class APToCPELinkCreate(
    WorkspacePerformCreateMixin, mixins.CreateModelMixin, generics.GenericAPIView
):
    serializer_class = APToCPELinkSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class APToCPELinkGet(
    WorkspacePerformCreateMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    WorkspaceFeatureGetQuerySetMixin,
    generics.GenericAPIView,
):
    serializer_class = APToCPELinkSerializer
    lookup_field = "uuid"
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class PointToPointLinkCreate(
    WorkspacePerformCreateMixin, mixins.CreateModelMixin, generics.GenericAPIView
):
    serializer_class = PointToPointLinkSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class PointToPointLinkGet(
    WorkspacePerformCreateMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    WorkspaceFeatureGetQuerySetMixin,
    generics.GenericAPIView,
):
    serializer_class = PointToPointLinkSerializer
    lookup_field = "uuid"
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class CoverageAreaCreate(
    WorkspacePerformCreateMixin, mixins.CreateModelMixin, generics.GenericAPIView
):
    serializer_class = CoverageAreaSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class CoverageAreaGet(
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    WorkspaceFeatureGetQuerySetMixin,
    generics.GenericAPIView,
):
    serializer_class = CoverageAreaSerializer
    permission_classes = [AllowAny]
    lookup_field = "uuid"

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class AccessPointSectorCreate(
    WorkspaceFeatureGetQuerySetMixin,
    WorkspacePerformCreateMixin,
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    generics.GenericAPIView,
):
    serializer_class = AccessPointSectorSerializer
    permission_classes = [AllowAny]

    renderer_classes = [
        renderers.TemplateHTMLRenderer,
        renderers.JSONRenderer,
        renderers.BrowsableAPIRenderer,
    ]
    template_name = "workspace/molecules/access_point_sector_pagination.html"

    pagination_class = pagination.IspToolboxCustomAjaxPagination

    filter_backends = [filters.OrderingFilter,
                       SessionFilter, AccessPointFilter]
    ordering_fields = [
        "name", "last_updated", "height", "radius", "azimuth", "heading", "frequency"
    ]
    ordering = ["-last_updated"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update(
            {"ordering": self.request.GET.get("ordering", self.ordering[0])})
        context.update({
            'freq_options': {
                '2.4 GHz': 2.437,
                '3.65 GHz': 3.6,
                '5 GHz': 5.4925,
                '11 GHz': 11.2,
                '18 GHz': 18.7,
                '24 GHz': 24.35,
                '60 GHz': 64.79
            },
            'default_sector': AccessPointSector()
        })
        return context

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AccessPointSectorGet(
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    WorkspaceFeatureGetQuerySetMixin,
    generics.GenericAPIView,
):
    serializer_class = AccessPointSectorSerializer
    permission_classes = [AllowAny]
    lookup_field = "uuid"

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class AccessPointCoverageResults(View):
    class EMPTY_BUILDING:
        json = {"type": "Polygon", "coordinates": []}

    def create_building_response(self, coverage):
        features = []
        nearby = coverage.buildingcoverage_set.all()
        nearby_ids = [b.msftid for b in nearby]
        buildings = MsftBuildingOutlines.objects.filter(
            id__in=nearby_ids).all()
        buildings = {b.id: b.geog for b in buildings}
        features = [
            {
                "type": "Feature",
                "geometry": json.loads(
                    b.geog.json
                    if b.geog
                    else buildings.get(
                        b.msftid, AccessPointCoverageResults.EMPTY_BUILDING()
                    ).json
                ),
                "properties": {
                    "serviceable": b.status,
                    "msftid": b.msftid,
                    "cpe_location": json.loads(b.cpe_location.json)
                    if b.cpe_location
                    else None,
                },
            }
            for b in nearby
        ]
        fc = {"type": "FeatureCollection", "features": features}
        return JsonResponse(fc)

    def get(self, request, uuid):
        try:
            ap = AccessPointLocation.get_rest_queryset(request).get(uuid=uuid)
            coverage = AccessPointCoverageBuildings.objects.get(ap=ap)
            if not coverage.result_cached():
                raise Http404
            return self.create_building_response(coverage)
        except AccessPointLocation.DoesNotExist:
            logging.info("Failed to find AP matching UUID")
        try:
            sector = AccessPointSector.get_rest_queryset(
                request).get(uuid=uuid)
            coverage = AccessPointCoverageBuildings.objects.get(sector=sector)
            if not coverage.result_cached():
                raise Http404
            return self.create_building_response(coverage)
        except AccessPointCoverageBuildings.DoesNotExist:
            raise Http404


class AccessPointCoverageStatsView(View):
    def get(self, request, uuid):
        # TODO: deprecate
        try:
            ap = AccessPointLocation.get_rest_queryset(request).get(uuid=uuid)
            coverage = AccessPointCoverageBuildings.objects.get(ap=ap)
            return JsonResponse(coverage.coverageStatistics())
        except AccessPointLocation.DoesNotExist:
            logging.info("Failed to find AP matching UUID")
        # ENDTODO: deprecate
        try:
            sector = AccessPointSector.get_rest_queryset(
                request).get(uuid=uuid)
            coverage = AccessPointCoverageBuildings.objects.get(sector=sector)
            return JsonResponse(coverage.coverageStatistics())
        except AccessPointCoverageBuildings.DoesNotExist:
            raise Http404


class AccessPointCoverageViewshedOverlayView(View):
    def get(self, request, **kwargs):
        uuid = kwargs.get("uuid", None)
        # TODO: deprecate
        try:
            ap = AccessPointLocation.get_rest_queryset(request).get(
                uuid=uuid
            )
            viewshed = Viewshed.objects.get(ap=ap)
            if not viewshed.result_cached():
                logging.info('Viewshed overlay not calculated')
                raise Http404("Overlay not cached")
            return JsonResponse(viewshed.getTilesetInfo())
        except (AccessPointLocation.DoesNotExist, Viewshed.DoesNotExist):
            logging.info('Failed to find Accesspoint matching UUID or viewshed not calculated yet')
            pass
        # ENDTODO: deprecate
        try:
            sector = AccessPointSector.get_rest_queryset(request).get(
                uuid=uuid
            )
            viewshed = Viewshed.objects.get(sector=sector)
            if not viewshed.result_cached():
                logging.info('Viewshed overlay not calculated')
                raise Http404("Overlay not cached")
            return JsonResponse(viewshed.getTilesetInfo())
        except (AccessPointSector.DoesNotExist, Viewshed.DoesNotExist):
            raise Http404
        except Exception:
            logging.exception("failed to return coverage overlay")
            raise
