from django.shortcuts import redirect, render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from workspace.forms import NewWorkspaceSessionFromKMZForm
from workspace.models import WorkspaceMapSession
from django.urls import reverse
from django.utils.translation import gettext
import logging


class SessionFileImportView(LoginRequiredMixin, View):
    """
    This endpoint is used to turn KMZ files into workspace sessions
    - there are many possible tags that KMZ files can have
    - so this might not work if it's not following a *certain* standard
    """

    def post(self, request):
        form = NewWorkspaceSessionFromKMZForm(
            request.POST, files=request.FILES)
        try:
            session = WorkspaceMapSession.importFile(request)
            return redirect(reverse('workspace:edit_network', args=[session.pk, session.name]))
        except Exception as e:
            logging.exception('failed to accept upload file')
            # name of session already exists? TODO: duplicate unique constraint error handling
            if 'unique constraint' in repr(e) and '(owner_id, name)' in repr(e):
                form.add_error('name', gettext(
                    'Session with name already exists.'))
            else:
                form.add_error(
                    'file', gettext('Failed to parse file - see sample file'))
            context = {'workspace_forms': {'new_session_from_kmz': form}}
            return render(request, 'workspace/pages/upload_session.index.html', context=context)

    def get(self, request):
        context = {'workspace_forms': {
            'new_session_from_kmz': NewWorkspaceSessionFromKMZForm()}}
        return render(request, 'workspace/pages/upload_session.index.html', context=context)
