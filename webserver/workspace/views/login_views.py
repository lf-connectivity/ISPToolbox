from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from IspToolboxAccounts.forms import (
    IspToolboxUserCreationForm, IspToolboxUserSignUpInfoForm, IspToolboxUserAuthenticationForm,
    IspToolboxUserPasswordChangeForm, IspToolboxUserInfoChangeForm, IspToolboxUserDeleteAccountForm
)
from django.contrib.auth import logout


class DefaultWorkspaceView(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/login_view.html',
            {
                'showSignUp': True,
                'showEmailSignUp': False,
                'authentication_form': IspToolboxUserAuthenticationForm,
                'sign_up_form': IspToolboxUserCreationForm,
            }
        )


class OptionalInfoWorkspaceView(LoginRequiredMixin, View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/optional_info.html',
            {
                'optional_info_form': IspToolboxUserSignUpInfoForm
            }
        )


class AccountSettingsView(LoginRequiredMixin, View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/account_settings_page.html',
            {
                'account_form': IspToolboxUserInfoChangeForm(instance=request.user),
                'password_form': IspToolboxUserPasswordChangeForm(user=request.user),
                'delete_account_form': IspToolboxUserDeleteAccountForm,
            }
        )

    def post(self, request, **kwargs):
        context = {
            'account_form': IspToolboxUserInfoChangeForm(request.POST, instance=request.user),
            'password_form': IspToolboxUserPasswordChangeForm(request.user, request.POST),
            'delete_account_form': IspToolboxUserDeleteAccountForm(request.POST),
        }
        if "update_account" in request.POST:
            if context['account_form'].is_valid():
                context['account_form'].save()
        else:
            context.update({'account_form': IspToolboxUserInfoChangeForm(instance=request.user)})

        if "change_password" in request.POST:
            if context['password_form'].is_valid():
                context['password_form'].save()
        else:
            context.update({'password_form': IspToolboxUserPasswordChangeForm(user=request.user)})

        if "delete_account" in request.POST and context['delete_account_form'].is_valid():
            if context['delete_account_form'].try_delete(request):
                logout(request)
                return redirect('isptoolbox_pro_home')

        return render(
            request,
            'workspace/pages/account_settings_page.html',
            context
        )
