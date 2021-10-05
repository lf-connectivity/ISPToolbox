from django.contrib import admin
from django.db.models.query import QuerySet
from django.http.request import HttpRequest
from IspToolboxAccounts import models


@admin.register(models.User)
class IspToolboxUserAdmin(admin.ModelAdmin):
    change_form_template = 'IspToolboxAccounts/user_change_form_template.html'


@admin.register(models.NewUserExperience)
class ChangeNuxSettings(admin.ModelAdmin):
    change_list_template = 'IspToolboxAccounts/update_nux_settings.html'


class StaffUser(models.User):
    class Meta:
        proxy = True
        verbose_name = 'Staff User'
        verbose_name_plural = 'Staff Users'


@admin.register(StaffUser)
class IspToolboxStaffUserAdmin(admin.ModelAdmin):
    def get_queryset(self, request: HttpRequest) -> QuerySet:
        super_query = super().get_queryset(request)
        return super_query.filter(is_staff=True)


class SuperUser(models.User):
    class Meta:
        proxy = True
        verbose_name = 'Super User'
        verbose_name_plural = 'Super Users'


@admin.register(SuperUser)
class IspToolboxSuperUserAdmin(admin.ModelAdmin):
    def get_queryset(self, request: HttpRequest) -> QuerySet:
        super_query = super().get_queryset(request)
        return super_query.filter(is_superuser=True)


admin.site.register(models.IspToolboxUserSignUpInfo)
