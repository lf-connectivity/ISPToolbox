from django.views import View
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

class MMWavePlannerView(View):
    def get(self, request):
        return render(request, 'mmWave/planner.html')

class MMWaveHelpCenterView(View):
    def get(self, request):
        return render(request, 'mmWave/helpcenter.html')