from django.http.response import Http404, JsonResponse
from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from workspace import models as workspace_models
from workspace.forms import UploadTowerCSVForm, WorkspaceForms, ExportMarketEvaluatorForm
from IspToolboxApp.views.MarketEvaluatorTooltips import TOOLTIPS

import json

from workspace.models.session_models import WorkspaceMapSession

TECH_CODE_MAPPING = {
    10: 'DSL',
    11: 'DSL',
    12: 'DSL',
    20: 'DSL',
    30: 'Other Copper Wireline',
    40: 'Cable',
    41: 'Cable',
    42: 'Cable',
    43: 'Cable',
    50: 'Fiber',
    60: 'Satellite',
    70: 'Fixed Wireless',
    90: 'Power Line',
    0: 'Other'
}


class MarketEvaluatorCompetitorModalView(View):
    def post(self, request):
        request_json = json.loads(request.body)

        # Convert the service provider response to something that's more meaningful,
        # aka a list of objects like this:
        # <isp name>: {
        #    down_ad_speed: <speed>,
        #    tech_used: <array of strings>,
        #    up_ad_speed: <speed>
        # }
        service_providers = {}
        service_providers_response = request_json['serviceProvidersResponse']
        for i in range(0, len(service_providers_response['competitors'])):
            name = service_providers_response['competitors'][i]
            down_ad_speed = service_providers_response['down_ad_speed'][i]
            tech_used = ', '.join(
                set([TECH_CODE_MAPPING[code]
                    for code in service_providers_response['tech_used'][i]])
            )
            up_ad_speed = service_providers_response['up_ad_speed'][i]

            service_providers[name] = {
                'down_ad_speed': down_ad_speed,
                'tech_used': tech_used,
                'up_ad_speed': up_ad_speed
            }

        context = {
            'service_providers': service_providers,
            'broadband_now': request_json['broadbandNowResponse']['bbnPriceRange']
        }

        return render(request, 'workspace/organisms/market_eval_competitor_modal_ajax.html', context)


class MarketEvaluatorSessionExportView(LoginRequiredMixin, View):
    def get(self, request, session_id=None):
        raise Http404

    def post(self, request, session_id=None):
        form = ExportMarketEvaluatorForm(request.POST)
        if form.is_valid():
            session = WorkspaceMapSession.get_rest_queryset(
                request).get(uuid=session_id)
            url = session.exportKMZ(form)
            return JsonResponse({'url': url}, status=200)
        else:
            return JsonResponse({}, status=400)


class MarketEvaluatorView(LoginRequiredMixin, View):
    def get(self, request, session_id=None, name=None):
        if session_id is None:
            if workspace_models.WorkspaceMapSession.objects.filter(owner=request.user).exists():
                session = workspace_models.WorkspaceMapSession.objects.filter(
                    owner=request.user
                ).order_by('-last_updated').first()
                return redirect('workspace:market_eval', session.uuid, session.name)
            else:
                session = workspace_models.WorkspaceMapSession(
                    owner=request.user)
                session.save()
                return redirect('workspace:market_eval', session.uuid, session.name)

        session = workspace_models.WorkspaceMapSession.objects.filter(
            owner=request.user,
            uuid=session_id
        ).get()

        context = {
            'session': session,
            'geojson': session.get_session_geojson(),
            'workspace_forms': WorkspaceForms(request, session),
            'units': 'US',
            'tool': 'market_evaluator',
            'tower_upload_form': UploadTowerCSVForm,
            'title': 'Market Evaluator - ISP Toolbox',
            'tooltips': TOOLTIPS
        }
        return render(request, 'workspace/pages/market_evaluator.html', context)
