from rest_framework import generics
from django.shortcuts import render
from rest_framework.mixins import DestroyModelMixin
from workspace.models import (
    AccessPointLocation,
    AccessPointSerializer,
    AccessPointCoverageBuildings,
    AccessPointSectorSerializer,
)
import logging


class TooltipFormView(generics.GenericAPIView):
    lookup_field = "uuid"

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)

    def get_context(self, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        context = serializer.data.copy()
        context.update({"units": instance.map_session.units})
        context.update({"session": instance.map_session})
        context.update(dict((k, str(kwargs[k])) for k in kwargs))
        return context

    def get(self, request, *args, **kwargs):
        context = self.get_context(**kwargs)
        return render(request, self.template_name, context)


class AccessPointLocationFormView(DestroyModelMixin, generics.GenericAPIView):
    """
    Renders Tower Location Form
    """

    template_name = "workspace/molecules/access_point_location_form.html"
    serializer_class = AccessPointSerializer
    lookup_field = "uuid"

    def get_coverage_stats(self, instance):
        stats = {}
        try:
            coverage = AccessPointCoverageBuildings.objects.get(ap=instance)
            if coverage.result_cached():
                stats = {"coverage_stats": coverage.coverageStatistics()}
        except Exception as e:
            logging.error(e)
        return stats

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)

    def get(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        context = serializer.data.copy()
        context.update(self.get_coverage_stats(instance))
        context.update({"units": instance.map_session.units})
        return render(request, self.template_name, context)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        original_serializer = self.get_serializer(instance)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        context = original_serializer.data
        serializer.is_valid(raise_exception=False)
        try:
            serializer.save()
            context = serializer.data
        except Exception:
            context.update({"errors": serializer.errors})
        context.update(self.get_coverage_stats(instance))
        context.update({"units": instance.map_session.units})
        return render(request, self.template_name, context)

    def delete(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class TowerLocationFormView(TooltipFormView):
    template_name = "workspace/pages/tower_location_form.html"
    serializer_class = AccessPointSerializer


class SectorFormView(TooltipFormView):
    template_name = "workspace/pages/sector_form.html"
    serializer_class = AccessPointSectorSerializer

    def get_context(self, *args, **kwargs):
        context = super().get_context(**kwargs)
        ap = AccessPointLocation.objects.get(uuid=context['ap'], map_session=context['map_session'])
        serialized_ap = AccessPointSerializer(ap)
        context.update({"ap": serialized_ap.data})
        return context
