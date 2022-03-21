from django.http import HttpResponse
from django.shortcuts import render
from django.views import View
from workspace import models as workspace_models
from django.shortcuts import get_object_or_404
from waffle.mixins import WaffleFlagMixin


class ServiceabilityExportCsvView(WaffleFlagMixin, View):
    waffle_flag = "marketing"
    def get(self, request, uuid=None):
        obj = get_object_or_404(workspace_models.AccessPointSector.get_rest_queryset(request), pk=uuid)
        response = HttpResponse()
        response['Content-Type'] = 'text/csv'
        response['Content-Disposition'] = f'attachment; filename="{obj.pk}.csv"'
        obj.create_serviceable_download(response)
        return response
        

class ServiceabilityExportView(WaffleFlagMixin, View):
    waffle_flag = "marketing"
    def get(self, request):
        context = {}
        return render(request, "workspace/pages/serviceability_export.index.html", context)