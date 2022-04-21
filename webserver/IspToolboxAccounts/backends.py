from django.contrib.auth.backends import ModelBackend, UserModel
from django.db.models import Q
from django.conf import settings
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


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
        return settings.ENABLE_ACCOUNT_CREATION

    def save_user(self, request, sociallogin, form=None):
        # Redirect to questionnaire if new account
        if not sociallogin.is_existing:
            sociallogin.state['next'] = settings.ACCOUNT_SIGNUP_REDIRECT_URL
        return super().save_user(request, sociallogin, form)
