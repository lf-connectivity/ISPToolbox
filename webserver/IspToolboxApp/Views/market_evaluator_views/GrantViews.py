from django.views import View
from django.db import connections
from django.http import JsonResponse


class SelectCensusGroupView(View):
    def get(self, request):
        cbgid = request.GET.get('cbgid', '-1')
        resp = {'error' : -1}
        try:
            query_skeleton = """SELECT cbg_id, state_abbr, county, locations, reserve,St_asgeojson(geog) FROM auction_904_shp WHERE cbg_id = %s"""
            with connections['gis_data'].cursor() as cursor:
                cursor.execute(query_skeleton, [cbgid])
                result = cursor.fetchone()   
                resp = {'error' : 0, 'cbgid' : result[0], 'state': result[1], 'county' : result[2], 'locations' : result[3], 'reserve_price' : result[4], 'geojson' : result[5]}
        except:
            resp = {'error' : -2}
        return JsonResponse(resp)