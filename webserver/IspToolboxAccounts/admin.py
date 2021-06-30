from django.contrib import admin
from IspToolboxAccounts.models import User, IspToolboxUserSignUpInfo


@admin.register(User)
class IspToolboxUserAdmin(admin.ModelAdmin):
    change_form_template = 'IspToolboxAccounts/user_change_form_template.html'


admin.site.register(IspToolboxUserSignUpInfo)
