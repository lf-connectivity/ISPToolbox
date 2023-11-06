# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.http import Http404
from django.http.response import HttpResponseBadRequest
from rest_framework import generics
from django.shortcuts import render
from rest_framework.mixins import DestroyModelMixin
from workspace.models import (
    AccessPointLocation,
    AccessPointSerializer,
    AccessPointSector,
    AccessPointCoverageBuildings,
    AccessPointSectorSerializer,
    Viewshed,
)

import logging


class TooltipFormView(generics.GenericAPIView):
    lookup_field = "uuid"
    schema = None

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)

    def get_context(self, *args, serializer=None, **kwargs):
        instance = self.get_object()
        if not serializer:
            serializer = self.get_serializer(instance)
        context = serializer.data.copy()
        context.update({"units": instance.map_session.units})
        context.update({"session": instance.map_session})
        context.update(dict((k, str(kwargs[k])) for k in kwargs))
        return context

    def get(self, request, *args, **kwargs):
        context = self.get_context(**kwargs)
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=False)
        try:
            serializer.save()
            context = self.get_context(serializer=serializer, **kwargs)
            return render(request, self.template_name, context)
        except Exception:
            # On 400, don't return anything. This is done as a catch all, as
            # client-side validation should be working
            raise HttpResponseBadRequest()


class AccessPointLocationFormView(DestroyModelMixin, generics.GenericAPIView):
    """
    Renders Tower Location Form
    """

    template_name = "workspace/molecules/access_point_location_form.html"
    serializer_class = AccessPointSerializer
    lookup_field = "uuid"
    schema = None

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

        # Get AP information
        ap = AccessPointLocation.objects.get(
            uuid=context["ap"], map_session=context["map_session"]
        )
        serialized_ap = AccessPointSerializer(ap)
        context.update({"ap": serialized_ap.data})

        # Get sector information
        other_sectors = AccessPointSector.objects.filter(
            ap=ap, map_session=context["map_session"]
        ).exclude(uuid=context["uuid"])

        try:
            coverage = AccessPointCoverageBuildings.objects.filter(
                sector=context["uuid"],
            ).get()
            context.update({"coverage_stats": coverage.coverageStatistics()})
        except Exception:
            logging.exception("Could not find associated coverage")

        try:
            viewshed = self.get_object().viewshed
            context.update(
                {
                    "viewshed_status": {
                        "status": viewshed.task_status,
                        "progress_message": viewshed.progress_message,
                        "time_remaining": viewshed.time_remaining,
                    },
                }
            )
        except Viewshed.DoesNotExist:
            logging.info("Could not find viewshed")
        except Exception:
            logging.exception("Failed to retrieve viewshed stats")

        try:
            building_coverage = self.get_object().building_coverage
            context.update(
                {
                    "building_coverage": {
                        "status": building_coverage.task_status,
                    },
                }
            )
        except Exception:
            logging.exception("could not find corresponding building coverage")
            pass

        serialized_sectors = AccessPointSectorSerializer(other_sectors, many=True)
        context.update({"other_sectors": serialized_sectors.data})
        return context


class SectorStatsView(SectorFormView):
    template_name = "workspace/organisms/sector_tooltip_stat_row.html"
    serializer_class = AccessPointSectorSerializer

    def post(self, request, *args, **kwargs):
        raise Http404()
