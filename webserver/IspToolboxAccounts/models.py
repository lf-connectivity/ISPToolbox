# from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    def create_superuser(self, email, first_name, last_name, password=None, **extra_fields):
        if not email:
            raise ValueError("User must have an email")
        if not password:
            raise ValueError("User must have a password")
        if not first_name:
            raise ValueError("User must have a first name")
        if not last_name:
            raise ValueError("User must have a last name")

        user = self.model(
            email=self.normalize_email(email)
        )
        user.first_name = first_name
        user.last_name = last_name
        user.set_password(password)
        user.is_admin = True
        user.is_staff = True
        user.is_active = True
        user.is_superuser = True
        user.save(using=self._db)
        return user

    def create_user(self, email, first_name, last_name, password=None):
        """
        Creates and saves a User with the given email, first & last name and
        password
        """
        if not email:
            raise ValueError('Users must have an email address')
        if not password:
            raise ValueError("User must have a password")
        if not first_name:
            raise ValueError("User must have a first name")
        if not last_name:
            raise ValueError("User must have a last name")

        user = self.model(
            email=self.normalize_email(email),
            first_name=first_name,
            last_name=last_name,
        )

        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    objects = UserManager()

    class Meta:
        db_table = 'auth_user'


class IspToolboxUserSignUpInfo(models.Model):

    class CompanySizeChoices(models.TextChoices):
        ASPIRING = 'aspiring', _('I don\'t service anyone right now')
        SMALL = 'small', _('1 - 100')
        MEDIUM = 'medium', _('101 - 500')
        LARGE = 'large', _('501 - 2,000')
        XLARGE = 'xlarge', _('2,001 - 5,000')
        XXLARGE = 'xxlarge', _('+5,000')

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    company_website = models.CharField(max_length=100, null=True)
    company_size = models.CharField(
        default=None,
        null=True,
        max_length=50,
        choices=CompanySizeChoices.choices
    )

    is_business_role = models.BooleanField()
    is_tech_role = models.BooleanField()
    is_sales_role = models.BooleanField()

    is_goal_start = models.BooleanField()
    is_goal_acquire_customers = models.BooleanField()
    is_goal_expand = models.BooleanField()

    ip_prefix = models.GenericIPAddressField()
    ip_prefix_length = models.IntegerField()

    asn = models.CharField(max_length=30)
