from django.shortcuts import render
from django.views import View
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from workspace.models import Network, AccessPointLocation
from workspace import serializers
from workspace.forms import NetworkForm
from django.http import HttpResponseRedirect
from django.db.models import Count
from rest_framework import generics
from django.contrib.auth.forms import AuthenticationForm
from IspToolboxAccounts.forms import IspToolboxUserCreationForm
from rest_framework import generics, mixins


class DefaultWorkspaceView(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/default.html',
            {
                'showSignUp': True,
                'sign_in_form': AuthenticationForm,
                'sign_up_form': IspToolboxUserCreationForm,
            }
        )


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
        geojson = Network.toFeatureCollection(serializers.NetworkSerializer(network).data)
        return render(request, 'workspace/pages/network_edit.html', {'network': network, 'geojson': geojson})


# REST Views
class NetworkDetail(mixins.ListModelMixin,
                  mixins.CreateModelMixin,
                  generics.GenericAPIView):
    serializer_class = serializers.NetworkSerializer

    def get_queryset(self):
        user = self.request.user
        return Network.objects.filter(owner=user)
    
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)


class AccessPointREST(mixins.ListModelMixin,
                  mixins.CreateModelMixin,
                  generics.GenericAPIView):
    serializer_class = serializers.AccessPointSerializer

    def get_queryset(self):
        user = self.request.user
        return AccessPointLocation.objects.filter(owner=user)
    
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        return self.create(request, *args, **kwargs)