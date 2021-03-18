from django.shortcuts import render
from django.views import View
from django.contrib.auth.forms import AuthenticationForm
from IspToolboxAccounts.forms import IspToolboxUserCreationForm


class DefaultWorkspaceView(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/default.html',
            {
                'showSignUp': True,
                'sign_in_form': AuthenticationForm,
                'sign_up_form': IspToolboxUserCreationForm,
            }
        )