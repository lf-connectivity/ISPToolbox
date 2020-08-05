from django.views import View
from django.db import connections
from django.http import JsonResponse


class SelectCensusGroupView(View):
    def get(self, request):
        cbgid = request.GET.get('cbgid', '-1')
        resp = {'error' : -1}
        try:
            query_skeleton = """SELECT census_id, state_abbreviation, county_name, eligible_locations, reserve_price, St_asgeojson(geog) FROM rdofjun2020 JOIN tl_2019_bg ON census_id = geoid WHERE census_id = '281339506001'"""
            with connections['gis_data'].cursor() as cursor:
                cursor.execute(query_skeleton, [cbgid])
                result = cursor.fetchone()   
                resp = {'error' : 0, 'cbgid' : result[0], 'state': result[1], 'county' : result[2], 'locations' : result[3], 'reserve_price' : result[4], 'geojson' : result[5]}
        except:
            resp = {'error' : -2}
        return JsonResponse(resp)