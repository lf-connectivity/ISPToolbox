from django.contrib import admin
from workspace import models

admin.site.register(models.Radio)
admin.site.register(models.PTPLink)
admin.site.register(models.AccessPointLocation)
admin.site.register(models.AccessPointCoverageBuildings)
admin.site.register(models.Viewshed)
admin.site.register(models.MultiplayerSession)
admin.site.register(models.ViewshedTile)
