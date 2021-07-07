from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
from django.contrib.gis.geos import Point
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404

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
                        name=row['Name'],
                        location=Point(y=float(row['Latitude']), x=float(row['Longitude'])),
                        height=float(row['Height(ft)']),
                        max_radius=float(row['Radius(mi)']),
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

        session = get_object_or_404(
            workspace_models.WorkspaceMapSession,
            owner=request.user,
            uuid=session_id
        )

        context = {
            'session': session,
            'geojson': session.get_session_geojson(),
            'workspace_forms': WorkspaceForms(request, session),
            'should_collapse_link_view': True,
            'beta': True,
            'units': session.units_old,
            'tower_upload_form': UploadTowerCSVForm,
            'title': 'LiDAR LOS Check - ISP Toolbox'
        }
        return render(request, 'workspace/pages/network_edit.html', context)
