from django.contrib import admin


class IspToolboxAdminSite(admin.AdminSite):
    index_template = "admin/workspace/custom_admin_index.html"
