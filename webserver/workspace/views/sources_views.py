from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from workspace import models as workspace_models

# Map from url shorthand to link text
_SOURCE_PAGES = {
    'market_eval_sources': 'Market Evaluator'
}


class MarketEvaluatorSourcesView(LoginRequiredMixin, View):
    def get(self, request, session_id=None, name=None):
        if session_id is None:
            if workspace_models.WorkspaceMapSession.objects.filter(owner=request.user).exists():
                session = workspace_models.WorkspaceMapSession.objects.filter(
                    owner=request.user
                ).order_by('-last_updated').first()
                return redirect("market_eval_sources", session.uuid, session.name)
            else:
                session = workspace_models.WorkspaceMapSession(owner=request.user)
                session.save()
                return redirect("market_eval_sources", session.uuid, session.name)

        session = workspace_models.WorkspaceMapSession.objects.filter(
            owner=request.user,
            uuid=session_id
        ).get()

        context = {
            'session': session,
            'workspace_account': True,
            'title': 'Market Evaluator Sources - ISP Toolbox',
            'page_url': 'market_eval_sources',
            'page_template': 'workspace/pages/market_evaluator.html',
            'source_pages': _SOURCE_PAGES
        }
        return render(request, 'workspace/pages/market_evaluator_sources.html', context)
