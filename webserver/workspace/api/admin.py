from django.contrib import admin
from workspace.api import models

admin.site.register(models.AsyncTaskAPIModel)
