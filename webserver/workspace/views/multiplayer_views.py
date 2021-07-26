from django.shortcuts import render, redirect
from django.views import View
from workspace import models
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from workspace.mixnins import SuperuserRequiredMixin


@method_decorator(login_required, name='dispatch')
class MultiplayerTestView(SuperuserRequiredMixin, View):
    def get(self, request, session_id=None):
        session, created = models.MultiplayerSession.objects.get_or_create(
            session_id=session_id
        )
        if session_id is None:
            return redirect(request.path_info + f'{session.session_id}/')
        token = session.storeUserAuthSession(request.user)
        context = {
                'session': {
                    'id': session.session_id,
                    'token': token
                }
        }
        return render(
            request,
            'workspace/pages/multiplayer_test.html',
            context
        )
