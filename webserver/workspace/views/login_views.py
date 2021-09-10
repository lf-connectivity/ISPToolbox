from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views import View
from django.views.generic.edit import CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
from IspToolboxAccounts.forms import (
    IspToolboxUserCreationForm, IspToolboxUserSignUpInfoForm, IspToolboxUserAuthenticationForm,
    IspToolboxUserPasswordChangeForm, IspToolboxUserInfoChangeForm, IspToolboxUserDeleteAccountForm
)
from django.contrib.auth import logout


class WorkspaceDashboard(LoginRequiredMixin, View):
    def get(self, request):
        return render(request, 'workspace/pages/dashboard.html')


class DefaultWorkspaceView(View):
    def get(self, request, **kwargs):
        showSurvey = (not request.user.is_anonymous) and not IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(
            owner=request.user
        ).exists()
        return render(
            request,
            'workspace/pages/login_view.html',
            {
                'showSurvey': showSurvey,
                'showSignUp': True,
                'showEmailSignUp': False,
                'authentication_form': IspToolboxUserAuthenticationForm,
                'sign_up_form': IspToolboxUserCreationForm,
            }
        )


class OptionalInfoWorkspaceView(LoginRequiredMixin, CreateView):
    form_class = IspToolboxUserSignUpInfoForm
    template_name = 'workspace/pages/optional_info.html'
    success_url = reverse_lazy('workspace:workspace_dashboard')

    def form_valid(self, form):
        form.instance.owner = self.request.user
        return super().form_valid(form)

    def get(self, request):
        if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(owner=request.user).exists():
            return redirect('workspace:optional_info_update')
        else:
            return super().get(request)


class OptionalInfoWorkspaceUpdateView(LoginRequiredMixin, UpdateView):
    form_class = IspToolboxUserSignUpInfoForm
    template_name = 'workspace/pages/optional_info.html'
    success_url = reverse_lazy('workspace:workspace_dashboard')

    def get_object(self):
        return IspToolboxUserSignUpInfoForm.Meta.model.objects.get(owner=self.request.user)


class AccountSettingsView(LoginRequiredMixin, View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/account_settings_page.html',
            {
                'account_form': IspToolboxUserInfoChangeForm(instance=request.user),
                'password_form': IspToolboxUserPasswordChangeForm(user=request.user),
                'delete_account_form': IspToolboxUserDeleteAccountForm,
                'optional_account_form': (
                    IspToolboxUserSignUpInfoForm(
                        instance=IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
                            owner=request.user)
                    )
                    if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(owner=request.user).exists()
                    else IspToolboxUserSignUpInfoForm
                ),
            }
        )

    def post(self, request, **kwargs):
        context = {
            'account_form': IspToolboxUserInfoChangeForm(request.POST, instance=request.user),
            'password_form': IspToolboxUserPasswordChangeForm(request.user, request.POST),
            'delete_account_form': IspToolboxUserDeleteAccountForm(request.POST),
            'optional_account_form': IspToolboxUserSignUpInfoForm(
                request.POST, instance=(
                    IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
                        owner=request.user)
                    if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(owner=request.user).exists()
                    else None
                )
            )
        }
        if "update_account" in request.POST:
            if context['account_form'].is_valid():
                context['account_form'].save()
        else:
            context.update(
                {'account_form': IspToolboxUserInfoChangeForm(instance=request.user)})

        if "change_password" in request.POST:
            if context['password_form'].is_valid():
                context['password_form'].save()
        else:
            context.update(
                {'password_form': IspToolboxUserPasswordChangeForm(user=request.user)})

        if "user_info" in request.POST:
            if context['optional_account_form'].is_valid():
                context['optional_account_form'].save()
        else:
            context.update({'optional_account_form': IspToolboxUserSignUpInfoForm(
                instance=IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
                    owner=request.user)
            )})

        if "delete_account" in request.POST and context['delete_account_form'].is_valid():
            if context['delete_account_form'].try_delete(request):
                logout(request)
                return redirect('workspace:workspace_dashboard')

        return render(
            request,
            'workspace/pages/account_settings_page.html',
            context
        )
