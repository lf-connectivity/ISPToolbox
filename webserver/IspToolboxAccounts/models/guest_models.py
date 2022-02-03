from guest_user.models import Guest, GuestManager
from django.contrib.auth import get_user_model
from django.db import models
from django.conf import settings as django_settings
from django.utils.timezone import now
from datetime import timedelta


MAX_AGE = 60 * 60 * 24 * 90

class IspToolboxGuestUserManager(GuestManager):
    def create_guest_user(self, request=None, username=None):
        User = get_user_model()
        if username is None:
            username = self.generate_username()
        email = f"{username}@isptoolbox.io"
        user = User.objects.create(
            email=email
        )
        self.create(user=user)
        user.username = email
        return user

class IspToolboxGuestUser(models.Model):
    objects = IspToolboxGuestUserManager()

    user = models.OneToOneField(
        to=django_settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name="User",
        related_name="guest+",
    )

    created_at = models.DateTimeField(
        verbose_name="Created at",
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "Guest"
        verbose_name_plural = "Guests"
        ordering = ["-created_at"]

    def __str__(self):
        return str(self.user)

    def is_expired(self) -> bool:
        """
        Check if the guest user has expired.

        """
        return self.created_at < now() - timedelta(seconds=MAX_AGE)
