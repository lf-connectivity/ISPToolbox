from django.contrib import admin
from IspToolboxAccounts.models import NewUserExperience, User, IspToolboxUserSignUpInfo


@admin.register(User)
class IspToolboxUserAdmin(admin.ModelAdmin):
    change_form_template = 'IspToolboxAccounts/user_change_form_template.html'


@admin.register(NewUserExperience)
class ChangeNuxSettings(admin.ModelAdmin):
    change_list_template = 'IspToolboxAccounts/update_nux_settings.html'


admin.site.register(IspToolboxUserSignUpInfo)
