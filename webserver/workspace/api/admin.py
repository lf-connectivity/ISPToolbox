from django.contrib import admin
from workspace.api import models
from webserver import settings

if not settings.PROD:
    admin.site.register(models.DummyTaskModel)
