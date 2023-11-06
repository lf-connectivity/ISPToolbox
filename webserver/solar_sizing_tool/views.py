# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.shortcuts import render
from django.views import View


class SolarSizingToolView(View):
    def get(self, request):
        context = {}
        return render(request, 'solar_sizing_tool/pages/solar_tool.index.html', context)
