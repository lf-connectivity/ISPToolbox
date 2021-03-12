from django.shortcuts import render
from django.http import JsonResponse, HttpResponseForbidden
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django.contrib.gis.geos import GEOSGeometry
from geopy.distance import distance as geopy_distance
import geopy.point as geopy_pt
import mmwave.lidar_utils.sample_links as samples
import copy
import uuid
import json
from mmwave.models.dsm_models import DSMException, DSMConversionJob
from mmwave.tasks.dsm_tasks import exportDSMData
from celery import states
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm


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
        beta = request.GET.get('beta', False)
        beta = True if isinstance(beta, str) and beta.lower() == 'true' else False

        # Make a deep copy of the sample points to avoid changing the samples for other requests
        tx = copy.deepcopy(samples.sunflower['tx'])
        rx = copy.deepcopy(samples.sunflower['rx'])

        if lat is not None and lon is not None:
            middle = geopy_pt.Point(float(lat), float(lon))
            d = geopy_distance(kilometers=0.100)
            rx_pt = d.destination(point=middle, bearing=90)
            tx_pt = d.destination(point=middle, bearing=270)
            tx['lng'], tx['lat'] = tx_pt[1], tx_pt[0]
            rx['lng'], rx['lat'] = rx_pt[1], rx_pt[0]

        context = {
            'tx': tx,
            'rx': rx,
            'fbid': fbid,
            'networkID': networkID,
            'units': units,
            'demo': True,
            'beta': beta
        }

        # we're in demo view: suggest user sign-in or create an account
        if request.user.is_anonymous:
            context['sign_up_form'] = UserCreationForm
            context['sign_in_form'] = AuthenticationForm

        return render(request, 'mmwave/index.html', context)


@method_decorator(xframe_options_exempt, name='dispatch')
class DSMExportView(View):
    """
    Demo view for DSM App, allows iframing, limited functionality, renders suggestion
    to sign up and unlock full version
    """
    def get(self, request):
        lat = request.GET.get('lat', None)
        lon = request.GET.get('lon', None)

        if lat is None or lon is None:
            lat = samples.sunflower['tx']['lat']
            lon = samples.sunflower['tx']['lng']

        context = {'mapdefault': {'center': [lon, lat], 'zoom': 15}}
        return render(request, 'mmwave/pages/dsm_app.index.html', context)


# TODO achong - demo view cross origin cookies
@method_decorator(csrf_exempt, name='dispatch')
class CreateExportDSM(View):
    def post(self, request):
        """
        """
        try:
            request_area = GEOSGeometry(json.dumps(
                json.load(request).get('aoi', {})
            ))
            # Start pipeline - return credentials + uuid
            conversion = DSMConversionJob(area_of_interest=request_area)
            conversion.save()
            valid_request, reason = conversion.isValidRequest()
            if not valid_request:
                raise DSMException(reason)
            task = exportDSMData.delay(conversion.uuid)
            conversion.task = task.id
            conversion.save()
            return JsonResponse({'uuid': conversion.uuid, 'access_token': conversion.access_token})
        except DSMException as e:
            return JsonResponse({'error': str(e)})
        except Exception:
            return JsonResponse({'error': 'An unexpected error occured'})

    def get(self, request, uuid=None):
        job = DSMConversionJob.objects.filter(uuid=uuid).get()
        if job is None or not job.isRequestAuthorized(request):
            return HttpResponseForbidden()
        job_status = job.getTaskStatus()
        return JsonResponse({
            'status': job_status,
            'url': job.getS3Presigned() if job_status == states.SUCCESS else None
        })
