from django.shortcuts import render
from django.views import View
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from workspace.models import Network, AccessPointLocation, AccessPointCoverage, AccessPointLocation
from gis_data.models import MsftBuildingOutlines
from workspace import serializers
from workspace.forms import NetworkForm
from django.http import HttpResponseRedirect
from django.db.models import Count
from rest_framework import generics
from django.contrib.auth.forms import AuthenticationForm
from IspToolboxAccounts.forms import IspToolboxUserCreationForm
from rest_framework import generics, mixins
from django.http import JsonResponse
from workspace.serializers import AccessPointSerializer
import json


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


class EditNetworkView(View):
    def get(self, request, network_id=None):
        network = Network.objects.filter(uuid=network_id).first()
        geojson = AccessPointLocation.getUsersAccessPoints(request.user, AccessPointSerializer)
        context = {
            'network' : network,
            'geojson': geojson,
            'should_collapse_link_view': True,
            'beta': True,
            'units': 'US',
        }
        return render(request, 'workspace/pages/network_edit.html', context)
