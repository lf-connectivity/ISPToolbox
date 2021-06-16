from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
from django.contrib.gis.geos import Point
from django.contrib.auth.mixins import LoginRequiredMixin
import csv

from workspace.models import AccessPointLocation
from workspace import models as workspace_models
from workspace.forms import UploadTowerCSVForm, WorkspaceForms


class BulkUploadTowersView(LoginRequiredMixin, View):
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


class EditNetworkView(LoginRequiredMixin, View):
    def get(self, request, session_id=None, name=None):
        if session_id is None:
            if workspace_models.WorkspaceMapSession.objects.filter(owner=request.user).exists():
                session = workspace_models.WorkspaceMapSession.objects.filter(
                    owner=request.user
                ).order_by('-last_updated').first()
                return redirect("edit_network", session.uuid, session.name)
            else:
                session = workspace_models.WorkspaceMapSession(owner=request.user)
                session.save()
                return redirect("edit_network", session.uuid, session.name)

        session = workspace_models.WorkspaceMapSession.objects.filter(
            owner=request.user,
            uuid=session_id
        ).get()

        geojson = session.get_session_geojson(request)
        context = {
            'session': session,
            'geojson': geojson,
            'workspace_forms': WorkspaceForms(request),
            'should_collapse_link_view': True,
            'beta': True,
            'units': 'US',
            'tower_upload_form': UploadTowerCSVForm,
            'title': 'LiDAR LOS Check - ISP Toolbox'
        }
        return render(request, 'workspace/pages/network_edit.html', context)
