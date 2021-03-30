from django.shortcuts import render
from django.views import View
from IspToolboxAccounts.forms import (
    IspToolboxUserCreationForm, IspToolboxUserSignUpInfoForm, IspToolboxUserAuthenticationForm
)
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator


class DefaultWorkspaceView(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/login_view.html',
            {
                'showSignUp': True,
                'sign_in_form': IspToolboxUserAuthenticationForm,
                'sign_up_form': IspToolboxUserCreationForm,
            }
        )


@method_decorator(login_required, name='dispatch')
class OptionalInfoWorkspaceView(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/optional_info.html',
            {
                'optional_info_form': IspToolboxUserSignUpInfoForm
            }
        )
