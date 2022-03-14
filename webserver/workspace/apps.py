from django.apps import AppConfig
from django.contrib.admin.apps import AdminConfig
import logging


class WorkspaceConfig(AppConfig):
    name = 'workspace'
    def ready(self):
        logging.error("ISP Toolbox Ready")
        pass


class IspToolboxAdminConfig(AdminConfig):
    default_site = 'workspace.adminsite.IspToolboxAdminSite'
