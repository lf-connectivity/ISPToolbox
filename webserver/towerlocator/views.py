from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from .tasks import getViewShed
from django.http import JsonResponse
from django.contrib.gis.geos import Point
import json
from .models import TowerLocatorMarket
from celery import current_app
from django.http import HttpResponseNotAllowed


@method_decorator(csrf_exempt, name='dispatch')
class TowerLocatorCoverage(View):
    def post(self, request):
        resp = {'error': None}
        try:
            # Load Parameters
            lat = float(request.POST['lat'])
            lng = float(request.POST['lng'])
            height = float(request.POST['height'])

            # Create Tower Object
            tower = TowerLocatorMarket(location=Point([lat, lng]), height=float(height))
            tower.save()

            # Asynchronously run viewshed calculation
            task = getViewShed.delay(tower.uuid)
            tower.task = task.id
            tower.save(update_fields=['task'])

            # Return tower identifier
            resp = {
                'uuid': tower.uuid,
                'token': tower.token,
                'error': None
            }
        except Exception:
            resp['error'] = 'Failed to get tower\'s market'

        return JsonResponse(resp)

    def get(self, request):
        resp = {'error': None}
        try:
            uuid = request.GET['uuid']
            tower = TowerLocatorMarket.objects.get(uuid=uuid)

            if not tower.isAccessAuthorized(request):
                return HttpResponseNotAllowed

            task = current_app.AsyncResult(tower.task)
            tower.refresh_from_db()
            resp['status'] = task.status
            resp['coverage'] = json.loads(tower.coverage.json) if tower.coverage else None
        except Exception as e:
            resp['error'] = str(e)
        return JsonResponse(resp)
