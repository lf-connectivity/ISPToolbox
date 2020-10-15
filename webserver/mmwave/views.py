from django.shortcuts import render
from django.views import View
from django.http import JsonResponse, HttpResponse
from django.contrib.gis.geos import Point
from mmwave.tasks import getBuildingProfile, \
    getElevationProfile, getLidarProfile

from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from mmwave.scripts.load_lidar_boundaries import getLidarResource
link_distance_limit = 1600


@method_decorator(xframe_options_exempt, name='dispatch')
class TGLinkView(View):
    def get(self, request):
        # # Sunflower MS link Water Tower
        # tx = {'name': 'radio_0', 'lng': -90.53716599941286, 'lat': 33.5451235458682, 'id': 0, 'hgt': 35}
        # rx = {'name': 'radio_1', 'lng': -90.53423166275023, 'lat': 33.545454397676316, 'id': 1, 'hgt': 4}
        # Puerto Rico Link
        tx = {'name': 'radio_0', 'lng': -66.10326724720488, 'lat': 18.415117149683724, 'id': 0, 'hgt': 20}
        rx = {'name': 'radio_1', 'lng': -66.09963601155968, 'lat': 18.415797385500298, 'id': 1, 'hgt': 4}
        return render(request, 'tg_link_check.html', {'tx': tx, 'rx': rx})


class LinkGISDataView(View):
    def get(self, request):
        resp = {
            'error': None,
            'tree_profile': None,
            'building_profile': None,
            'terrain_profile': None,
            'lidar_profile': None,
            'points': 0
        }
        try:
            tx = Point([float(f) for f in request.GET.get('tx', '').split(',')])
            rx = Point([float(f) for f in request.GET.get('rx', '').split(',')])
            if geopy_distance(lonlat(tx.x, tx.y), lonlat(rx.x, rx.y)).meters > link_distance_limit:
                resp['error'] = 'Link too long'
                return JsonResponse(resp)
            building_profile = getBuildingProfile(tx, rx)
            # tree_profile = getTreeCanopyProfile(tx, rx)
            terrain_profile = getElevationProfile(tx, rx)
            lidar_profile, pt_count = getLidarProfile(tx, rx)
            resp['building_profile'] = building_profile
            resp['tree_profile'] = []
            resp['terrain_profile'] = terrain_profile
            resp['lidar_profile'] = lidar_profile
            resp['points'] = pt_count
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)


class UpdateLidarBoundariesView(View):
    def get(self, request):
        try:
            new_pt_clouds = getLidarResource()
            return HttpResponse('Success: Added ' + str(len(new_pt_clouds)) + ' pt clouds')
        except Exception as e:
            return HttpResponse('Failed:' + str(e))


class TestGeocoderView(View):
    def get(self, request):
        return render(request, 'test_geocoder.html')
