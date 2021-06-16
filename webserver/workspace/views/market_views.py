from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from workspace import models as workspace_models
from workspace.forms import UploadTowerCSVForm, WorkspaceForms
from IspToolboxApp.models.MarketEvaluatorTooltips import TOOLTIPS


class MarketEvaluatorView(LoginRequiredMixin, View):
    def get(self, request, session_id=None, name=None):
        if session_id is None:
            if workspace_models.WorkspaceMapSession.objects.filter(owner=request.user).exists():
                session = workspace_models.WorkspaceMapSession.objects.filter(
                    owner=request.user
                ).order_by('-last_updated').first()
                return redirect("market_eval", session.uuid, session.name)
            else:
                session = workspace_models.WorkspaceMapSession(owner=request.user)
                session.save()
                return redirect("market_eval", session.uuid, session.name)

        session = workspace_models.WorkspaceMapSession.objects.filter(
            owner=request.user,
            uuid=session_id
        ).get()

        geojson = session.get_session_geojson(request)
        context = {
            'session': session,
            'geojson': geojson,
            'workspace_forms': WorkspaceForms(request),
            'beta': True,
            'units': 'US',
            'tower_upload_form': UploadTowerCSVForm,
            'title': 'Market Evaluator - ISP Toolbox',
            'tooltips': TOOLTIPS
        }
        return render(request, 'workspace/pages/market_evaluator.html', context)
