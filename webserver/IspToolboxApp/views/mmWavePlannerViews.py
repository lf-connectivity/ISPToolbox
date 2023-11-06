# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.views import View
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt


@method_decorator(xframe_options_exempt, name='dispatch')
class MMWavePlannerView(View):
    def get(self, request):
        return render(request, 'mmWave/planner.html')


class MMWaveHelpCenterView(View):
    def get(self, request):
        return render(request, 'mmWave/helpcenter.html')
