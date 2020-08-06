from django.views import View
from django.shortcuts import render
from csp.decorators import csp_update

# , SCRIPT_SRC=['https://api.mapbox.com','https://code.jquery.com','https://cdnjs.cloudflare.com', 'https://stackpath.bootstrapcdn.com']


class MMWavePlannerView(View):
    @csp_update( STYLE_SRC=["'self'",'https://stackpath.bootstrapcdn.com',"https://api.mapbox.com" ,"'sha256-79N6gSeZI5t5qx+vbMcu8ufgWx5WX0+dxsLp2JgNxy0='"],SCRIPT_SRC=['https://api.mapbox.com', "'sha256-JSuvPOW0wncacmdncEcQyArz4BK1TGzOG2/XFIUT4ls='", 'https://code.jquery.com', 'https://cdnjs.cloudflare.com/', 'https://stackpath.bootstrapcdn.com'],IMG_SRC=['data: blob:'], CHILD_SRC=['blob:'], WORKER_SRC=['blob:'], CONNECT_SRC=['https://*.tiles.mapbox.com', 'https://api.mapbox.com', 'https://events.mapbox.com'])
    def get(self, request):
        return render(request, 'mmWave/planner.html')
