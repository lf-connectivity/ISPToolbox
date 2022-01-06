from django.http.response import Http404
from django.shortcuts import render
from django.views import View

from rest_framework import generics

from workspace.models import CPESerializer

_TEMPLATE = "workspace/pages/cpe_location_form.html"


class LocationTooltipView(View):
    def get(self, request, lng, lat):
        try:
            lng = float(lng)
            lat = float(lat)
            return render(request, _TEMPLATE)
        except ValueError:
            raise Http404


class CPETooltipView(generics.GenericAPIView):
    template_name = _TEMPLATE
    serializer_class = CPESerializer
    lookup_field = "uuid"

    def get(self, request, *args, **kwargs):
        return render(request, self.template)
