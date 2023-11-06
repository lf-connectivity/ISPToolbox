# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.apps import AppConfig
from django.contrib.admin.apps import AdminConfig
import logging


class WorkspaceConfig(AppConfig):
    name = 'workspace'

    def ready(self):
        logging.error("django apps ready")


class IspToolboxAdminConfig(AdminConfig):
    default_site = 'workspace.adminsite.IspToolboxAdminSite'
