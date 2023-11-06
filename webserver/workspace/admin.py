# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.contrib import admin
from workspace import models


class IspToolboxAdminSite(admin.AdminSite):
    pass


admin.site.register(models.Radio)
admin.site.register(models.PTPLink)
admin.site.register(models.AccessPointLocation)
admin.site.register(models.AccessPointCoverageBuildings)
admin.site.register(models.Viewshed)
admin.site.register(models.MultiplayerSession)
admin.site.register(models.ViewshedTile)
admin.site.register(models.WorkspaceMapSession)

admin.site.register(models.PointToPointLink)

admin.site.register(models.AccessInformationJob)
admin.site.register(models.DeleteInformationJob)
