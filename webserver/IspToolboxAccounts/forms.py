from django.contrib.auth.forms import UserCreationForm
from IspToolboxAccounts.models import User


class IspToolboxUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
