from django.shortcuts import render
from django.http import JsonResponse, HttpResponseForbidden
from django.views import View
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django.contrib.gis.geos import GEOSGeometry
from geopy.distance import distance as geopy_distance
import geopy.point as geopy_pt
import mmwave.lidar_utils.sample_links as samples
import copy
import uuid
import json
import calendar
from datetime import datetime
from mmwave.models.dsm_models import DSMException, DSMConversionJob, MAXIMUM_AOI_AREA_KM2
from mmwave.tasks.dsm_tasks import exportDSMData
from mmwave.forms import DSMExportAOIFileForm
from celery import states
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from workspace.models import WorkspaceMapSession
from django.utils.translation import gettext as _


@method_decorator(xframe_options_exempt, name='dispatch')
class NetworkDemoView(View):
    """
    Demo view for LOS check, allows iframing, Access Points - All Foreign Key'd on
    Django Session
    """
    def get(self, request):
        map_session, created = WorkspaceMapSession.get_or_create_demo_view(request)
        context = {
            'session': map_session,
            'geojson': map_session.get_session_geojson(),
            'units': map_session.units_old,
            'workspace_account': False,
            'title': 'LiDAR LOS Check - ISP Toolbox',
            'should_collapse_link_view': True,
        }
        return render(request, 'workspace/pages/demo_network.index.html', context)


class MarketDemoView(View):
    """
    Demo view for market evaluator app
    """
    def get(self, request):
        map_session, created = WorkspaceMapSession.get_or_create_demo_view(request)
    
        context = {
            'session': map_session,
            'geojson': map_session.get_session_geojson(),
        }


        return render(request, 'workspace/pages/demo_market.index.html', context)



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
            'workspace_account': False,
            'ptponly': True,
        }

        # we're in demo view: suggest user sign-in or create an account
        if request.user.is_anonymous:
            context['sign_up_form'] = UserCreationForm
            context['authentication_form'] = AuthenticationForm

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

        context = {
            'mapdefault': {'center': [lon, lat], 'zoom': 15},
            'resolution': f'{0.5} m',
            'area_limit': f'{MAXIMUM_AOI_AREA_KM2} km2',
            'upload_form': DSMExportAOIFileForm
        }
        return render(request, 'mmwave/pages/dsm_app.index.html', context)


# TODO achong - demo view cross origin cookies
@method_decorator(csrf_exempt, name='dispatch')
class CreateExportDSM(View):
    def post(self, request):
        """
        """
        try:
            aoi_form = DSMExportAOIFileForm(request.POST, request.FILES)
            request_area = None
            if aoi_form.is_valid():
                request_area = GEOSGeometry(json.dumps(aoi_form.convertToAOI()))
            else:
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
            'error': job.error,
            'url': job.create_presigned_url() if job_status == states.SUCCESS else None
        })


@method_decorator(xframe_options_exempt, name='dispatch')
class LatestLidarView(View):
    def valid_date_request(self, month, year):
        try:
            request_date = datetime(month=month, year=year, day=1)
            min_date = datetime(month=4, year=2021, day=1)
            if request_date <= min_date:
                return min_date
            if request_date > datetime.today():
                return datetime.today()
            return request_date
        except Exception:
            return datetime.today()

    def get(self, request, month=None, year=None):
        context = {}

        date = self.valid_date_request(month, year)
        month = date.month
        year = date.year

        previous_month = month - 1 or 12
        previous_year = year if month - 1 else year - 1
        if previous_year >= 2021 and previous_month > 3:
            previous_url = reverse('demo-latest_gis', kwargs={'month': previous_month, 'year': previous_year})
        else:
            previous_url = None
        next_month = month + 1 if month + 1 <= 12 else 1
        next_year = year if month + 1 <= 12 else year + 1
        if datetime(year=next_year, month=next_month, day=1) <= datetime.today():
            next_url = reverse('demo-latest_gis', kwargs={'month': next_month, 'year': next_year})
        else:
            next_url = None

        context.update({
            'previous_url': previous_url,
            'next_url': next_url,
        })

        month = "{:02d}".format(month)

        context.update({
            'month': month,
            'year': year,
            'month_name':  _(calendar.month_name[int(month)]),
        })
        return render(
            request,
            'mmwave/pages/latest_lidar.index.html',
            context
        )
