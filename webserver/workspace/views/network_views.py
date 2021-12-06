from django.contrib.sessions.models import Session
from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
from django.contrib.gis.geos import Point
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404

import csv

from workspace.models import AccessPointLocation, WorkspaceMapSession
from workspace import models as workspace_models
from workspace.forms import UploadTowerCSVForm, WorkspaceForms
from workspace.models.model_constants import KM_2_MI, M_2_FT


class BulkUploadTowersView(LoginRequiredMixin, View):
    def post(self, request):
        try:
            csv_file = request.FILES.get('file', None)
            decoded_file = csv_file.read().decode('utf-8').splitlines()
            for row in csv.DictReader(decoded_file, delimiter=','):
                _, created = AccessPointLocation.objects.update_or_create(
                    owner=request.user,
                    name=row['Name'],
                    geojson=Point(
                        y=float(row['Latitude']), x=float(row['Longitude'])),
                    height=float(row['Height(ft)']) / M_2_FT,
                    max_radius=float(row['Radius(mi)']) / KM_2_MI,
                    session_id=request.session.session_key,
                    map_session_id=request.POST.get('map_session', None)
                )
            return redirect(request.GET.get('next', '/pro'))
        except Exception as e:
            raise e


class EditNetworkView(View):
    def get(self, request, session_id=None, name=None):
        if request.user and request.user.is_authenticated:
            workspace_account = True
            if session_id is None:
                if workspace_models.WorkspaceMapSession.objects.filter(owner=request.user).exists():
                    session = workspace_models.WorkspaceMapSession.objects.filter(
                        owner=request.user
                    ).order_by('-last_updated').first()
                    return redirect('workspace:edit_network', session.uuid, session.name)
                else:
                    session = workspace_models.WorkspaceMapSession(
                        owner=request.user)
                    session.save()
                    return redirect('workspace:edit_network', session.uuid, session.name)

            session = get_object_or_404(
                workspace_models.WorkspaceMapSession,
                owner=request.user,
                uuid=session_id
            )
        else:
            workspace_account = False
            if session_id:
                return redirect('workspace:edit_account_network')
            session, _ = WorkspaceMapSession.get_or_create_demo_view(request)

        context = {
            'session': session,
            'workspace_account': workspace_account,
            'geojson': session.get_session_geojson(),
            'workspace_forms': WorkspaceForms(request, session),
            'should_collapse_link_view': True,
            'units': session.units_old,
            'tower_upload_form': UploadTowerCSVForm,
            'title': 'LiDAR LOS Check - ISP Toolbox',
            'tool': 'los_check',
            'demo_network_view': False
        }
        return render(request, 'workspace/pages/network_edit.html', context)
