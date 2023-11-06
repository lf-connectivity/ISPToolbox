# (c) Meta Platforms, Inc. and affiliates. Copyright
# TODO: Better engineering: Rename source pages/pages in general to match tool names
# so we can put this info in one place instead of many.

from dataclasses import dataclass
from django import template
from django.urls import reverse_lazy


@dataclass
class _ToolInfo:
    app_page_template: str
    sources_page_url: str


register = template.Library()


_TOOL_INFO = {
    'market_evaluator': _ToolInfo(
        app_page_template='workspace/pages/market_evaluator.html',
        sources_page_url=reverse_lazy('workspace:sources', kwargs={'sources_page': 'market_eval'})
    ),
    'los_check': _ToolInfo(
        app_page_template='workspace/pages/network_edit.html',
        sources_page_url=reverse_lazy('workspace:sources', kwargs={'sources_page': 'edit_network'})
    )
}


@register.simple_tag
def load_tool_info(tool_name):
    return _TOOL_INFO[tool_name]
