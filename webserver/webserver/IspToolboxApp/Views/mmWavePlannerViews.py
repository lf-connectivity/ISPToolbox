from django.views import View
from django.shortcuts import render
from csp.decorators import csp_update
from django.contrib.auth.decorators import login_required

class MMWavePlannerView(View):
    @csp_update( STYLE_SRC=["'self'",'https://connect.facebook.net','https://stackpath.bootstrapcdn.com',"https://api.mapbox.com" ,"'sha256-79N6gSeZI5t5qx+vbMcu8ufgWx5WX0+dxsLp2JgNxy0='", "'sha256-tsYFq5pUcggQKFXnvmlvUrk8MgTJLL1Gjnqenv201b8='"],SCRIPT_SRC=["'self'",'http://connect.facebook.net', 'https://api.mapbox.com', 'https://code.jquery.com', 'https://cdnjs.cloudflare.com/', 'https://stackpath.bootstrapcdn.com', "'unsafe-inline'"],IMG_SRC=['data: blob:'], CHILD_SRC=['blob:'], WORKER_SRC=['blob:'], CONNECT_SRC=['https://*.tiles.mapbox.com', 'https://api.mapbox.com', 'https://events.mapbox.com'])
    def get(self, request):
        return render(request, 'mmWave/planner.html')
