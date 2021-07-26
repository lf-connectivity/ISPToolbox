from django.apps import AppConfig
from django.contrib.admin.apps import AdminConfig


class WorkspaceConfig(AppConfig):
    name = 'workspace'


class IspToolboxAdminConfig(AdminConfig):
    default_site = 'workspace.admin.IspToolboxAdminSite'
