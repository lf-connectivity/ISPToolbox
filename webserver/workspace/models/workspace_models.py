from django.db import models
from django.conf import settings


class ISPCompany(models.Model):
    name = models.CharField(max_length=128)
    employees = models.ManyToManyField(settings.AUTH_USER_MODEL, through='Employee')


class Employee(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    company = models.ForeignKey(ISPCompany, on_delete=models.CASCADE)
    date_joined = models.DateField()
