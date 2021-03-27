# from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db import models
from enum import Enum
from django.conf import settings


class User(AbstractUser):
    
    class Meta:
        db_table = 'auth_user'


class IspToolboxAccountCompanySize(Enum):
    ASPIRING = 'aspiring' 
    SMALL = 'small'
    MEDIUM = 'medium'
    LARGE = 'large'
    XLARGE = 'xlarge'
    XXLARGE = 'xxlarge'


class IspToolboxAccountGoals(Enum):
    START = 'start'
    ACQUIRE = 'acquire'
    EXPAND = 'expand'

class IspToolboxUserSignUpInfo(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    company_website = models.CharField(max_length=100, null=True)
    company_size = models.CharField(
        default=None,
        null=True,
        max_length=50,
        choices=[(tag, tag.value) for tag in IspToolboxAccountCompanySize]
    )

    is_business_role = models.BooleanField(null=True)
    is_tech_role = models.BooleanField(null=True)
    is_sales_role = models.BooleanField(null=True)

    is_goal_start = models.BooleanField(null=True)
    is_goal_acquire_customers = models.BooleanField(null=True)
    is_goal_expand = models.BooleanField(null=True)
