from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.utils.http import url_has_allowed_host_and_scheme
from django.views import View
from django.views.generic.edit import CreateView, UpdateView
from IspToolboxAccounts.forms import (
    IspToolboxUserCreationForm,
    IspToolboxUserSignUpInfoForm,
    IspToolboxUserAuthenticationForm,
    IspToolboxUserPasswordChangeForm,
    IspToolboxUserInfoChangeForm,
    IspToolboxUserDeleteAccountForm,
)
from django.contrib.auth import logout

from guest_user.functions import is_guest_user
from guest_user.mixins import RegularUserRequiredMixin


class WorkspaceDashboard(RegularUserRequiredMixin, View):
    def get(self, request):
        return render(request, "workspace/pages/dashboard.html")


class DefaultWorkspaceView(View):
    def get(self, request, **kwargs):
        if request.user.is_authenticated and not is_guest_user(request.user):
            return redirect(reverse_lazy("workspace:workspace_dashboard"))
        showSurvey = (
            not request.user.is_anonymous
        ) and not IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(
            owner=request.user
        ).exists()
        return render(
            request,
            "workspace/pages/login_view.html",
            {
                "showSurvey": showSurvey,
                "showSignUp": True,
                "showEmailSignUp": False,
                "authentication_form": IspToolboxUserAuthenticationForm,
                "sign_up_form": IspToolboxUserCreationForm,
            },
        )


class OptionalInfoWorkspaceView(RegularUserRequiredMixin, CreateView):
    form_class = IspToolboxUserSignUpInfoForm
    template_name = "workspace/pages/optional_info.html"
    success_url = reverse_lazy("workspace:workspace_dashboard")

    def form_valid(self, form):
        form.instance.owner = self.request.user
        # Save the Form
        original_response = super().form_valid(form)
        # To complete the sign-up flow -> send user to the page they were finally trying to get to
        next_url = self.request.POST.get("next", self.request.GET.get("next", None))
        url_is_safe = url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts=self.request.get_host(),
            require_https=self.request.is_secure(),
        )
        if next_url is not None and url_is_safe:
            return redirect(next_url)
        else:
            return original_response

    def get(self, request):
        if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(
            owner=request.user
        ).exists():
            return redirect("workspace:optional_info_update")
        else:
            return super().get(request)


class OptionalInfoWorkspaceUpdateView(RegularUserRequiredMixin, UpdateView):
    form_class = IspToolboxUserSignUpInfoForm
    template_name = "workspace/pages/optional_info.html"
    success_url = reverse_lazy("workspace:workspace_dashboard")

    def get_object(self):
        return IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
            owner=self.request.user
        )

    def get(self, request):
        if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(
            owner=request.user
        ).exists():
            return super().get(request)
        else:
            return redirect("workspace:optional_info")


class AccountSettingsView(RegularUserRequiredMixin, View):
    def get(self, request, **kwargs):
        context = {
            "nav_include_account_dropdown": True,
            "account_form": IspToolboxUserInfoChangeForm(instance=request.user),
            "password_form": IspToolboxUserPasswordChangeForm(user=request.user),
            "delete_account_form": IspToolboxUserDeleteAccountForm,
            "optional_account_form": IspToolboxUserSignUpInfoForm(
                instance=IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
                    owner=request.user
                )
                if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(
                    owner=request.user
                )
                else None
            ),
        }
        return render(
            request, "workspace/pages/account_settings_page.html", context=context
        )

    def post(self, request, **kwargs):
        context = {
            "nav_include_account_dropdown": True,
            "account_form": IspToolboxUserInfoChangeForm(
                request.POST, instance=request.user
            ),
            "password_form": IspToolboxUserPasswordChangeForm(
                request.user, request.POST
            ),
            "delete_account_form": IspToolboxUserDeleteAccountForm(request.POST),
            "optional_account_form": IspToolboxUserSignUpInfoForm(
                request.POST,
                instance=(
                    IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
                        owner=request.user
                    )
                    if IspToolboxUserSignUpInfoForm.Meta.model.objects.filter(
                        owner=request.user
                    ).exists()
                    else None
                ),
            ),
        }
        if "update_account" in request.POST:
            if context["account_form"].is_valid():
                context["account_form"].save()
        else:
            context.update(
                {"account_form": IspToolboxUserInfoChangeForm(instance=request.user)}
            )

        if "change_password" in request.POST:
            if context["password_form"].is_valid():
                context["password_form"].save()
        else:
            context.update(
                {"password_form": IspToolboxUserPasswordChangeForm(user=request.user)}
            )

        if "user_info" in request.POST:
            if context["optional_account_form"].is_valid():
                context["optional_account_form"].instance.owner = request.user
                context["optional_account_form"].save()
                context["form_save_success"] = True
        else:
            context.update(
                {
                    "optional_account_form": IspToolboxUserSignUpInfoForm(
                        instance=IspToolboxUserSignUpInfoForm.Meta.model.objects.get(
                            owner=request.user
                        )
                    )
                }
            )

        if (
            "delete_account" in request.POST
            and context["delete_account_form"].is_valid()
        ):
            if context["delete_account_form"].try_delete(request):
                logout(request)
                return redirect("workspace:workspace_dashboard")

        return render(request, "workspace/pages/account_settings_page.html", context)
