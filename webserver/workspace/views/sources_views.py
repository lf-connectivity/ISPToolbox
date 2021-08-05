from dataclasses import dataclass
from django.http.response import Http404
from django.shortcuts import render
from django.views import View

import uuid

# Map from url shorthand to link text
_SOURCE_PAGES = {
    'market_eval_sources': 'Market Evaluator',
    'network_sources': 'LOS Check'
}

@dataclass
class _SourcesPage:
    app_page_template: str
    sources_page_template: str
    link_title: str
    page_title: str


_SOURCE_PAGES = {
    'market_eval': _SourcesPage(
        app_page_template='workspace/pages/market_evaluator.html',
        sources_page_template='workspace/pages/market_evaluator_sources.html',
        link_title='Market Evaluator',
        page_title='Market Evaluator Sources - ISP Toolbox'
    ),
    'edit_network': _SourcesPage(
        app_page_template='workspace/pages/network_edit.html',
        sources_page_template='workspace/pages/network_sources.html',
        link_title='Line of Sight',
        page_title='LiDAR LOS Check Sources - ISP Toolbox'
    )
}


class WorkspaceSourcesView(View):
    def get(self, request, sources_page):

        # Hack to get app pages rendering without a DB call.
        session = {
            'uuid': str(uuid.uuid4()),
            'center': [],
            'zoom': 0,
            'lock_dragging': True,
        }

        if sources_page not in _SOURCE_PAGES:
            raise Http404
        
        page = _SOURCE_PAGES[sources_page]

        context = {
            'session': session,
            'workspace_account': True,
            'title': page.page_title,
            'sources_page': sources_page,
            'sources_page_info': page,
            'sources_pages': _SOURCE_PAGES
        }
        return render(request, page.sources_page_template, context)
