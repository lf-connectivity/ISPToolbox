from django.contrib import admin
from workspace import models


class IspToolboxAdminSite(admin.AdminSite):
    index_template = "admin/workspace/custom_admin_index.html"


admin.site.register(models.Radio)
admin.site.register(models.PTPLink)
admin.site.register(models.AccessPointLocation)
admin.site.register(models.AccessPointCoverageBuildings)
admin.site.register(models.Viewshed)
admin.site.register(models.MultiplayerSession)
admin.site.register(models.ViewshedTile)
admin.site.register(models.WorkspaceMapSession)
