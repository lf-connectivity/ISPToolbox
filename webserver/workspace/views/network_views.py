from django.shortcuts import render, redirect
from django.views import View
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.http import HttpResponseRedirect
from django.db.models import Count
from django.http import JsonResponse
from django.contrib.gis.geos import Point
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
import csv
import uuid

from workspace import geojson_utils
from workspace.models import Network, AccessPointLocation, CPELocation, APToCPELink, NetworkMapPreferences
from workspace.forms import NetworkForm, UploadTowerCSVForm
from workspace.serializers import AccessPointSerializer, CPESerializer, APToCPELinkSerializer


@method_decorator(login_required, name='dispatch')
class DefaultNetworkView(View):
    def get(self, request):
        order = request.GET.get('order', '-last_edited')
        networks = Network.objects.filter(owner=request.user).all().annotate(num_links=Count('ptplinks')).order_by(order)
        page = request.GET.get('page', 1)
        paginator = Paginator(networks, 10)
        try:
            networks = paginator.page(page)
        except PageNotAnInteger:
            networks = paginator.page(1)
        except EmptyPage:
            networks = paginator.page(paginator.num_pages)
        return render(request, 'workspace/pages/network_page.html', {
                    'networks': networks,
                    'form': NetworkForm(),
                    'order': order
                    }
                )

    def post(self, request):
        form = NetworkForm(request.POST)

        if form.is_valid() and not request.user.is_anonymous:
            form.instance.owner = request.user
            form.save()
            return HttpResponseRedirect('/pro/networks/')
        else:
            return HttpResponseRedirect('/error/')


class DeleteNetworkView(View):
    def post(self, request, network_id=None):
        Network.objects.filter(uuid=network_id, owner=request.user).all().delete()
        return HttpResponseRedirect('/pro/networks/')


class BulkUploadTowersView(View):
    def post(self, request):
        if not request.user.is_anonymous:
            try:
                csv_file = request.FILES.get('file', None)
                decoded_file = csv_file.read().decode('utf-8').splitlines()
                for row in csv.DictReader(decoded_file, delimiter=','):
                    _, created = AccessPointLocation.objects.update_or_create(
                        owner=request.user,
                        name=row['name'],
                        location=Point(y=float(row['latitude']), x=float(row['longitude'])),
                        height=float(row['height']),
                        max_radius=float(row['radius']),
                    )
                return redirect(request.GET.get('next', '/pro'))
            except Exception as e:
                return JsonResponse({'error': str(e)})
        return redirect(request.GET.get('next', '/pro'))


@method_decorator(login_required, name='dispatch')
class EditNetworkView(View):
    def get(self, request, network_id=None):
        network = Network.objects.filter(uuid=network_id, owner=request.user).first()
        if network is None:
            network = {'uuid': uuid.uuid4()}
        aps = AccessPointLocation.get_features_for_user(request.user, AccessPointSerializer)
        cpes = CPELocation.get_features_for_user(request.user, CPESerializer)
        links = APToCPELink.get_features_for_user(request.user, APToCPELinkSerializer)
        geojson = geojson_utils.merge_feature_collections(aps, cpes, links)
        map_preferences, _ = NetworkMapPreferences.objects.get_or_create(owner=request.user)
        context = {
            'network': network,
            'geojson': geojson,
            'should_collapse_link_view': True,
            'beta': True,
            'units': 'US',
            'tower_upload_form': UploadTowerCSVForm,
            'map_preferences': map_preferences,
        }
        return render(request, 'workspace/pages/network_edit.html', context)
