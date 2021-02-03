from django.shortcuts import render
from django.views import View

from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from geopy.distance import distance as geopy_distance
import geopy.point as geopy_pt
import mmwave.lidar_utils.sample_links as samples

import uuid


@method_decorator(xframe_options_exempt, name='dispatch')
class LOSCheckDemo(View):
    """
    Demo view for LOS check, allows iframing, limited functionality, renders suggestion
    to sign up and unlock full version
    """
    def get(self, request, network_id=None):
        fbid = int(request.GET.get('id', 0))
        networkID = uuid.uuid4()
        lat = request.GET.get('lat', None)
        lon = request.GET.get('lon', None)
        units = request.GET.get('units', 'US')

        tx = samples.sunflower['tx']
        rx = samples.sunflower['rx']

        if lat is not None and lon is not None:
            middle = geopy_pt.Point(float(lat), float(lon))
            d = geopy_distance(kilometers=0.100)
            rx = d.destination(point=middle, bearing=90)
            tx = d.destination(point=middle, bearing=270)
            tx['lng'], tx['lat'] = tx[1], tx[0]
            rx['lng'], rx['lat'] = rx[1], rx[0]

        context = {
            'tx': tx,
            'rx': rx,
            'fbid': fbid,
            'networkID': networkID,
            'units': units,
            'demo': True
        }
        return render(request, 'mmwave/index.html', context)
