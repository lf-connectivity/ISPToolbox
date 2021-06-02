from django.views import View
from workspace.models import (
    AccessPointLocation, AccessPointCoverageBuildings,
    CPELocation, APToCPELink, CoverageArea, AccessPointBasedCoverageArea
)
from workspace import pagination
from gis_data.models import MsftBuildingOutlines
from workspace.models import (
    AccessPointSerializer,
    CPESerializer, APToCPELinkSerializer, WorkspaceMapSessionSerializer,
    WorkspaceMapSession, CoverageAreaSerializer, APCoverageAreaSerializer
)
from rest_framework import generics, mixins, renderers, filters
from django.http import JsonResponse
import json


# REST Views
class NetworkDetail(mixins.ListModelMixin,
                    mixins.CreateModelMixin,
                    mixins.UpdateModelMixin,
                    generics.RetrieveAPIView):
    serializer_class = WorkspaceMapSessionSerializer

    def get_queryset(self):
        user = self.request.user
        return WorkspaceMapSession.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AccessPointLocationListCreate(mixins.ListModelMixin,
                                    mixins.CreateModelMixin,
                                    generics.GenericAPIView):
    serializer_class = AccessPointSerializer
    lookup_field = 'uuid'

    renderer_classes = [renderers.TemplateHTMLRenderer, renderers.JSONRenderer, renderers.BrowsableAPIRenderer]
    template_name = "workspace/molecules/access_point_pagination.html"

    pagination_class = pagination.IspToolboxCustomAjaxPagination

    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['name', 'last_updated', 'height', 'max_radius']
    ordering = ['-last_updated']

    def get_queryset(self):
        user = self.request.user
        session = self.request.GET.get('session')
        return AccessPointLocation.objects.filter(owner=user, session=session)

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
                             generics.GenericAPIView):
    serializer_class = AccessPointSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return AccessPointLocation.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class CPELocationCreate(mixins.CreateModelMixin,
                        generics.GenericAPIView):
    serializer_class = CPESerializer

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class CPELocationGet(mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     mixins.UpdateModelMixin,
                     generics.GenericAPIView):
    serializer_class = CPESerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return CPELocation.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class APToCPELinkCreate(mixins.CreateModelMixin,
                        generics.GenericAPIView):
    serializer_class = APToCPELinkSerializer

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class APToCPELinkGet(mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin,
                     mixins.UpdateModelMixin,
                     generics.GenericAPIView):
    serializer_class = APToCPELinkSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return APToCPELink.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class CoverageAreaCreate(mixins.CreateModelMixin,
                         generics.GenericAPIView):
    serializer_class = CoverageAreaSerializer

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class CoverageAreaGet(mixins.RetrieveModelMixin,
                      mixins.DestroyModelMixin,
                      mixins.UpdateModelMixin,
                      generics.GenericAPIView):
    serializer_class = CoverageAreaSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return CoverageArea.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class APCoverageAreaCreate(mixins.CreateModelMixin,
                         generics.GenericAPIView):
    serializer_class = APCoverageAreaSerializer

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class APCoverageAreaGet(mixins.RetrieveModelMixin,
                        mixins.DestroyModelMixin,
                        mixins.UpdateModelMixin,
                        generics.GenericAPIView):
    serializer_class = APCoverageAreaSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return AccessPointBasedCoverageArea.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class AccessPointCoverageResults(View):
    def get(self, request, uuid):
        ap = AccessPointLocation.objects.filter(owner=request.user, uuid=uuid).get()
        coverage = AccessPointCoverageBuildings.objects.filter(ap=ap).order_by('-created').first()
        features = []
        for building in coverage.nearby_buildings.all():
            feature = {
                "type": "Feature",
                "geometry": json.loads(
                    MsftBuildingOutlines.objects.get(id=building.msftid).geog.json
                ),
                "properties": {
                    "serviceable": building.status,
                    "msftid": building.msftid
                }
            }
            features.append(feature)
        fc = {'type': 'FeatureCollection', 'features': features}
        return JsonResponse(fc)


class AccessPointCoverageStatsView(View):
    def get(self, request, uuid):
        ap = AccessPointLocation.objects.filter(owner=request.user, uuid=uuid).get()
        coverage = AccessPointCoverageBuildings.objects.filter(ap=ap).order_by('-created').first()
        return JsonResponse(coverage.coverageStatistics())
