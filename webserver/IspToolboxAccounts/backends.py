from django.contrib.auth.backends import ModelBackend, UserModel
from django.db.models import Q
from django.conf import settings
from django.shortcuts import redirect, render
from django.urls import reverse_lazy
from allauth.exceptions import ImmediateHttpResponse
from allauth.socialaccount.providers.base import AuthError
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
import logging

from IspToolboxAccounts.utils import enable_account_creation


class EmailBackend(ModelBackend):
    def authenticate(self, request, email=None, password=None, **kwargs):
        try:
            user = UserModel.objects.get(Q(email__iexact=email))
        except UserModel.DoesNotExist:
            UserModel().set_password(password)
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user


if settings.PROD:
    from djangosaml2.backends import Saml2Backend

    class SSOAdminBackend(Saml2Backend):
        def save_user(self, user, *args, **kwargs):
            # SSO login = admin access
            user.is_staff = True
            user.is_superuser = True
            user.save()
            return super().save_user(user, *args, **kwargs)


class FBLoginAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, socialaccount):
        return enable_account_creation()

    def authentication_error(
        self, request, provider_id, error=None, exception=None, extra_context=None
    ):
        # Was it really an auth error or just a user hitting the auth endpoint with an empty form?
        if error == AuthError.UNKNOWN and not exception:
            raise ImmediateHttpResponse(
                redirect(reverse_lazy("workspace:sign_up_workspace"))
            )

        if exception:
            logging.exception(
                "An error occured while authenticating a user via Facebook:"
            )
        else:
            logging.error("An error occured while authenticating a user via Facebook:")

        if error:
            logging.error("\tError: %s", error)
        if extra_context:
            logging.error("\tExtra login context: %s", extra_context)

        raise ImmediateHttpResponse(
            render(
                request,
                "workspace/error.html",
                {
                    "error_title": "Facebook Login Failure",
                    "error_msg": "An error occurred while attempting to login with Facebook. Please login again.",
                },
            )
        )

    def save_user(self, request, sociallogin, form=None):
        # Redirect to questionnaire if new account
        if not sociallogin.is_existing:
            sociallogin.state["next"] = settings.ACCOUNT_SIGNUP_REDIRECT_URL
        return super().save_user(request, sociallogin, form)
