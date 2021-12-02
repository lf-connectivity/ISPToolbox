from django.contrib.sessions.models import Session
from django.http.response import Http404
from django.views import View
from workspace.models import (
    AccessPointLocation, AccessPointCoverageBuildings
)
from workspace import pagination
from gis_data.models import MsftBuildingOutlines
from workspace.models import (
    AccessPointSerializer,
    CPESerializer, APToCPELinkSerializer, WorkspaceMapSessionSerializer,
    WorkspaceMapSession, CoverageAreaSerializer,
    Viewshed, PointToPointLinkSerializer
)
from rest_framework.permissions import AllowAny
from rest_framework import generics, mixins, renderers, filters
from django.http import JsonResponse
import json


class WorkspacePerformCreateMixin:
    """
    Mixin for REST Views to create new workspace models with foreign keys to the
    reuqest session or request user
    """

    def perform_create(self, serializer):
        session = None
        if self.request.session and self.request.session.session_key is not None:
            session = Session.objects.get(pk=self.request.session.session_key)
        user = self.request.user
        if self.request.user.is_anonymous:
            user = None
        serializer.save(owner=user, session=session)


class WorkspaceFeatureGetQuerySetMixin:
    """
    Mixin for REST Views to get the appropriate query set for the model
    using the request's user or session
    """

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)


# REST Views
class NetworkDetail(WorkspacePerformCreateMixin,
                    mixins.ListModelMixin,
                    mixins.CreateModelMixin,
                    mixins.UpdateModelMixin,
                    generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = WorkspaceMapSessionSerializer

    def get_queryset(self):
        return (
            WorkspaceMapSession.objects.filter(owner=self.request.user) |
            WorkspaceMapSession.objects.filter(session=self.request.session)
        )

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
        session = request.GET.get('session', None)
        if session is not None:
            return queryset.filter(map_session=session)
        else:
            return queryset


class AccessPointLocationListCreate(WorkspaceFeatureGetQuerySetMixin,
                                    WorkspacePerformCreateMixin,
                                    mixins.ListModelMixin,
                                    mixins.CreateModelMixin,
                                    generics.GenericAPIView):
    serializer_class = AccessPointSerializer
    permission_classes = [AllowAny]

    renderer_classes = [renderers.TemplateHTMLRenderer,
                        renderers.JSONRenderer, renderers.BrowsableAPIRenderer]
    template_name = "workspace/molecules/access_point_pagination.html"

    pagination_class = pagination.IspToolboxCustomAjaxPagination

    filter_backends = [filters.OrderingFilter, SessionFilter]
    ordering_fields = ['name', 'last_updated', 'height', 'max_radius']
    ordering = ['-last_updated']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({
            'ordering': self.request.GET.get('ordering', self.ordering[0])
        })
        return context

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AccessPointLocationGet(mixins.RetrieveModelMixin,
                             mixins.DestroyModelMixin,
                             mixins.UpdateModelMixin,
                             WorkspaceFeatureGetQuerySetMixin,
                             generics.GenericAPIView):
    serializer_class = AccessPointSerializer
    permission_classes = [AllowAny]
    lookup_field = 'uuid'

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class CPELocationCreate(WorkspacePerformCreateMixin,
                        mixins.CreateModelMixin,
                        generics.GenericAPIView):
    """
    On creation the height is modified to be relative to dsm
    """
    serializer_class = CPESerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class CPELocationGet(mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     mixins.UpdateModelMixin,
                     WorkspaceFeatureGetQuerySetMixin,
                     generics.GenericAPIView):
    serializer_class = CPESerializer
    permission_classes = [AllowAny]
    lookup_field = 'uuid'

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class APToCPELinkCreate(WorkspacePerformCreateMixin,
                        mixins.CreateModelMixin,
                        generics.GenericAPIView):
    serializer_class = APToCPELinkSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class APToCPELinkGet(WorkspacePerformCreateMixin,
                     mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     mixins.UpdateModelMixin,
                     WorkspaceFeatureGetQuerySetMixin,
                     generics.GenericAPIView):
    serializer_class = APToCPELinkSerializer
    lookup_field = 'uuid'
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class PointToPointLinkCreate(WorkspacePerformCreateMixin,
                             mixins.CreateModelMixin,
                             generics.GenericAPIView):
    serializer_class = PointToPointLinkSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class PointToPointLinkGet(WorkspacePerformCreateMixin,
                          mixins.RetrieveModelMixin,
                          mixins.DestroyModelMixin,
                          mixins.UpdateModelMixin,
                          WorkspaceFeatureGetQuerySetMixin,
                          generics.GenericAPIView):
    serializer_class = PointToPointLinkSerializer
    lookup_field = 'uuid'
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class CoverageAreaCreate(WorkspacePerformCreateMixin,
                         mixins.CreateModelMixin,
                         generics.GenericAPIView):
    serializer_class = CoverageAreaSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class CoverageAreaGet(mixins.RetrieveModelMixin,
                      mixins.DestroyModelMixin,
                      mixins.UpdateModelMixin,
                      WorkspaceFeatureGetQuerySetMixin,
                      generics.GenericAPIView):
    serializer_class = CoverageAreaSerializer
    permission_classes = [AllowAny]
    lookup_field = 'uuid'

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

    def get(self, request, uuid):
        ap = AccessPointLocation.get_rest_queryset(request).get(uuid=uuid)
        coverage = AccessPointCoverageBuildings.objects.get(ap=ap)
        features = []
        nearby = coverage.nearby_buildings.all()
        nearby_ids = [b.msftid for b in nearby]
        buildings = MsftBuildingOutlines.objects.filter(
            id__in=nearby_ids).all()
        buildings = {b.id: b.geog for b in buildings}
        features = [{
            "type": "Feature",
            "geometry": json.loads(
                b.geog.json if b.geog else
                buildings.get(
                    b.msftid, AccessPointCoverageResults.EMPTY_BUILDING()
                ).json
            ),
            "properties": {
                "serviceable": b.status,
                "msftid": b.msftid
            }
        }
            for b in nearby]
        fc = {'type': 'FeatureCollection', 'features': features}
        return JsonResponse(fc)


class AccessPointCoverageStatsView(View):
    def get(self, request, uuid):
        ap = AccessPointLocation.get_rest_queryset(request).get(uuid=uuid)
        coverage = AccessPointCoverageBuildings.objects.get(ap=ap)
        return JsonResponse(coverage.coverageStatistics())


class AccessPointCoverageViewshedOverlayView(View):
    def get(self, request, **kwargs):
        try:
            ap = AccessPointLocation.get_rest_queryset(
                request).get(uuid=kwargs.get('uuid'))
            viewshed = Viewshed.objects.get(ap=ap)
            if not viewshed.result_cached():
                raise Http404("Overlay not cached")
        except Exception:
            raise Http404
        return JsonResponse(viewshed.getTilesetInfo())
