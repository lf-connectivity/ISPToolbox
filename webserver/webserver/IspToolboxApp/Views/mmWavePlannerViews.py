from django.views import View
from django.shortcuts import render

class MMWavePlannerView(View):
    def get(self, request):
        return render(request, 'mmWave/planner.html')
        