from django.views import View
from workspace.models import Network, AccessPointLocation, AccessPointCoverage, NetworkMapPreferences
from workspace import pagination
from gis_data.models import MsftBuildingOutlines
from workspace import serializers
from rest_framework import generics, mixins, renderers, filters
from django.http import JsonResponse
import json


# REST Views
class NetworkDetail(mixins.ListModelMixin,
                    mixins.CreateModelMixin,
                    mixins.UpdateModelMixin,
                    generics.RetrieveAPIView):
    serializer_class = serializers.NetworkSerializer

    def get_queryset(self):
        user = self.request.user
        return Network.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class NetworkMapPreferencesView(mixins.UpdateModelMixin,
                                generics.RetrieveAPIView):
    serializer_class = serializers.NetworkMapPreferencesSerializer

    def get_object(self):
        user = self.request.user
        obj, _ = NetworkMapPreferences.objects.get_or_create(owner=user)
        return obj

    def get_queryset(self):
        user = self.request.user
        return NetworkMapPreferences.objects.filter(owner=user)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class AccessPointLocationListCreate(mixins.ListModelMixin,
                                    mixins.CreateModelMixin,
                                    generics.GenericAPIView):
    serializer_class = serializers.AccessPointSerializer
    lookup_field = 'uuid'

    renderer_classes = [renderers.TemplateHTMLRenderer, renderers.JSONRenderer]
    template_name = "workspace/molecules/access_point_pagination.html"

    pagination_class = pagination.IspToolboxCustomAjaxPagination

    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['name', 'last_updated', 'height', 'max_radius']
    ordering = ['-last_updated']

    def get_queryset(self):
        user = self.request.user
        return AccessPointLocation.objects.filter(owner=user)

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
    serializer_class = serializers.AccessPointSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return AccessPointLocation.objects.filter(owner=user)

    def get(self, request, *args, **kwargs):
        return self.retrieve(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)

class CPEGet(mixins.RetrieveModelMixin,
             mixins.DestroyModelMixin,
             mixins.UpdateModelMixin,
             generics.GenericAPIView):
    serializer_class = serializers.CPESerializer
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


class AccessPointCoverageResults(View):
    def get(self, request, uuid):
        ap = AccessPointLocation.objects.filter(owner=request.user, uuid=uuid).get()
        coverage = AccessPointCoverage.objects.filter(ap=ap).order_by('-created').first()
        features = []
        for building in coverage.nearby_buildings.all():
            feature = {
                "type": "Feature",
                "geometry": json.loads(
                    MsftBuildingOutlines.objects.get(id=building.msftid).geog.json
                ),
                "properties": {
                    "serviceable": building.status,
                }
            }
            features.append(feature)
        fc = {'type': 'FeatureCollection', 'features': features}
        return JsonResponse(fc)
