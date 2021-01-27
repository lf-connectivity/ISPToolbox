from django.shortcuts import render
from django.views import View

from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from geopy.distance import distance as geopy_distance
import geopy.point as geopy_pt

import uuid
link_distance_limit = 2000


@method_decorator(xframe_options_exempt, name='dispatch')
class TGLinkView(View):
    def get(self, request, network_id=None):
        fbid = int(request.GET.get('id', 0))
        networkID = uuid.uuid4()
        lat = request.GET.get('lat', None)
        lon = request.GET.get('lon', None)
        units = 'US'

        tx_coords = {'lng': -66.10318337316896, 'lat': 18.415034033743083}
        rx_coords = {'lng': -66.09988844919782, 'lat': 18.411423676674275}

        # TODO: move this logic to the network model
        if lat is not None and lon is not None:
            middle = geopy_pt.Point(float(lat), float(lon))
            d = geopy_distance(kilometers=0.100)
            rx = d.destination(point=middle, bearing=90)
            tx = d.destination(point=middle, bearing=270)
            tx_coords = {'lng': tx[1], 'lat': tx[0]}
            rx_coords = {'lng': rx[1], 'lat': rx[0]}

        # Sunflower MS link Water Tower
        # tx = {
        #     'name': 'radio_0',
        #     'color': '#E29842',
        #     'lng': -90.53716599941286,
        #     'lat': 33.5451235458682,
        #     'id': 0,
        #     'hgt': 100
        # }
        # rx = {
        #     'name': 'radio_1',
        #     'color': '#42B72A',
        #     'lng': -90.53423166275023,
        #     'lat': 33.545454397676316,
        #     'id': 1,
        #     'hgt': 15
        # }
        # Puerto Rico Link
        tx = {
            'name': 'radio_0',
            'color': '#E29842',
            'lng': tx_coords['lng'],
            'lat': tx_coords['lat'],
            'id': 0,
            'hgt': 69
        }
        rx = {
            'name': 'radio_1',
            'color': '#42B72A',
            'lng': rx_coords['lng'],
            'lat': rx_coords['lat'],
            'id': 1,
            'hgt': 33
        }
        # # Puerto Rico Link
        # tx = {'name': 'radio_0', 'lng': -66.09455208440198, 'lat': 18.413009468818956, 'id': 0, 'hgt': 40}
        # rx = {'name': 'radio_1', 'lng': -66.09625993172662, 'lat': 18.41382434446693, 'id': 1, 'hgt': 35}
        # # Puerto Rico Link - Issues with Lidar, outlier points
        # tx = {'name': 'radio_0', 'lng': -66.10318337316896, 'lat': 18.415034033743083, 'id': 0, 'hgt': 20}
        # rx = {'name': 'radio_1', 'lng': -66.10258857962704, 'lat': 18.411482741088264, 'id': 1, 'hgt': 60}
        # # South Lake Tahoe (no data available)
        # tx = {'name': 'radio_0', 'lng': -119.98405485393732, 'lat': 38.9332644376359, 'id': 0, 'hgt': 35}
        # rx = {'name': 'radio_1', 'lng': -119.98803300700314, 'lat': 38.933988683584545, 'id': 1, 'hgt': 4}
        return render(request, 'mmwave/index.html', {'tx': tx, 'rx': rx, 'fbid': fbid, 'networkID': networkID, 'units': units})


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
        units = 'US'

        tx_coords = {'lng': -66.10318337316896, 'lat': 18.415034033743083}
        rx_coords = {'lng': -66.09988844919782, 'lat': 18.411423676674275}

        if lat is not None and lon is not None:
            middle = geopy_pt.Point(float(lat), float(lon))
            d = geopy_distance(kilometers=0.100)
            rx = d.destination(point=middle, bearing=90)
            tx = d.destination(point=middle, bearing=270)
            tx_coords = {'lng': tx[1], 'lat': tx[0]}
            rx_coords = {'lng': rx[1], 'lat': rx[0]}

        tx = {
            'name': 'radio_0',
            'color': '#E29842',
            'lng': tx_coords['lng'],
            'lat': tx_coords['lat'],
            'id': 0,
            'hgt': 69
        }
        rx = {
            'name': 'radio_1',
            'color': '#42B72A',
            'lng': rx_coords['lng'],
            'lat': rx_coords['lat'],
            'id': 1,
            'hgt': 33
        }
        context = {
            'tx': tx,
            'rx': rx,
            'fbid': fbid,
            'networkID': networkID,
            'units': units,
            'demo': True
        }
        return render(request, 'mmwave/index.html', context)
