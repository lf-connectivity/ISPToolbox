from django.shortcuts import render
from django.views import View
from django.http import JsonResponse, HttpResponse
from django.contrib.gis.geos import Point
from mmwave.tasks import getElevationProfile, getLidarProfile
from mmwave.models import TGLink, EPTLidarPointCloud

from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from mmwave.scripts.load_lidar_boundaries import getLidarResource
import json
import uuid
link_distance_limit = 2000


@method_decorator(xframe_options_exempt, name='dispatch')
class TGLinkView(View):
    def get(self, request):
        fbid = int(request.GET.get('id', 0))
        networkID = uuid.uuid4()
        # # Sunflower MS link Water Tower
        # tx = {'name': 'radio_0', 'lng': -90.53716599941286, 'lat': 33.5451235458682, 'id': 0, 'hgt': 35}
        # rx = {'name': 'radio_1', 'lng': -90.53423166275023, 'lat': 33.545454397676316, 'id': 1, 'hgt': 4}
        # Puerto Rico Link
        tx = {'name': 'radio_0', 'color': '#E29842', 'lng': -66.10318337316896, 'lat': 18.415034033743083, 'id': 0, 'hgt': 20}
        rx = {'name': 'radio_1', 'color': '#42B72A', 'lng': -66.09988844919782, 'lat': 18.411423676674275, 'id': 1, 'hgt': 9}
        # # Puerto Rico Link
        # tx = {'name': 'radio_0', 'lng': -66.09455208440198, 'lat': 18.413009468818956, 'id': 0, 'hgt': 40}
        # rx = {'name': 'radio_1', 'lng': -66.09625993172662, 'lat': 18.41382434446693, 'id': 1, 'hgt': 35}
        # # Puerto Rico Link - Issues with Lidar, outlier points
        # tx = {'name': 'radio_0', 'lng': -66.10318337316896, 'lat': 18.415034033743083, 'id': 0, 'hgt': 20}
        # rx = {'name': 'radio_1', 'lng': -66.10258857962704, 'lat': 18.411482741088264, 'id': 1, 'hgt': 60}
        # # South Lake Tahoe (no data available)
        # tx = {'name': 'radio_0', 'lng': -119.98405485393732, 'lat': 38.9332644376359, 'id': 0, 'hgt': 35}
        # rx = {'name': 'radio_1', 'lng': -119.98803300700314, 'lat': 38.933988683584545, 'id': 1, 'hgt': 4}
        return render(request, 'mmwave/index.html', {'tx': tx, 'rx': rx, 'fbid': fbid, 'networkID': networkID})


class LinkGISDataView(View):
    def get(self, request):
        resp = {
            'error': None,
            'tree_profile': None,
            'building_profile': None,
            'terrain_profile': None,
            'lidar_profile': None,
            'points': 0,
            'url': None,
            'name': None,
            'bb': [],
            'tx': {},
            'rx': {}
        }
        try:
            tx = Point([float(f) for f in request.GET.get('tx', '').split(',')])
            rx = Point([float(f) for f in request.GET.get('rx', '').split(',')])
            fbid = int(request.GET.get('id', 0))
            resolution = request.GET.get('resolution', 'low')
            # Create Object to Log User Interaction
            TGLink(tx=tx, rx=rx, fbid=fbid).save()
            if geopy_distance(lonlat(tx.x, tx.y), lonlat(rx.x, rx.y)).meters > link_distance_limit:
                resp['error'] = f'Link too long: limit {link_distance_limit} meters'
                return JsonResponse(resp)

            terrain_profile = getElevationProfile(tx, rx)
            try:
                lidar_profile, pt_count, ept_path, bb, name, tx_T, rx_T = getLidarProfile(
                    tx,
                    rx,
                    resolution=(5.0 if resolution == 'low' else 0.1)
                )
                resp['lidar_profile'] = lidar_profile
                resp['points'] = pt_count
                resp['url'] = ept_path
                resp['name'] = name
                resp['bb'] = bb
                resp['tx'] = tx_T
                resp['rx'] = rx_T
            except Exception as e:
                resp['error'] = str(e)
            resp['terrain_profile'] = terrain_profile
        except Exception as e:
            resp['error'] = str(e)

        return JsonResponse(resp)


class PointCloudBoundariesView(View):
    def get(self, request):
        point_clouds = EPTLidarPointCloud.objects.all()
        gc = {"type": "GeometryCollection", "geometries": [json.loads(pc.boundary.json) for pc in point_clouds]}
        return JsonResponse(gc)


# Admin Views:
class UpdateLidarBoundariesView(View):
    def get(self, request):
        try:
            new_pt_clouds = getLidarResource()
            return HttpResponse('Success: Added ' + str(len(new_pt_clouds)) + ' pt clouds')
        except Exception as e:
            return HttpResponse('Failed:' + str(e))
