from django.contrib.auth.backends import ModelBackend, UserModel
from django.db.models import Q

from djangosaml2.backends import Saml2Backend


class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = UserModel.objects.get(Q(email__iexact=username))
        except UserModel.DoesNotExist:
            UserModel().set_password(password)
        else:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user


class SSOAdminBackend(Saml2Backend):
    def save_user(self, user, *args, **kwargs):
        # SSO login = admin access
        user.is_staff = True
        user.is_superuser = True
        user.save()
        return super().save_user(user, *args, **kwargs)
