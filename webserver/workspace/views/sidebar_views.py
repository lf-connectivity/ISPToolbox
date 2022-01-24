from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404
from django.shortcuts import render
from workspace import models as workspace_models


class ToolSidebarView(LoginRequiredMixin, View):
    def get(self, request, uuid):
        session = get_object_or_404(
                    workspace_models.WorkspaceMapSession,
                    owner=request.user,
                    uuid=uuid
                )
        sidebar = session.get_sidebar_info()
        return render(request, 'workspace/molecules/tool_sidebar.html', {'sidebar': sidebar})
