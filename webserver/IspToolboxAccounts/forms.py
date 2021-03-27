from django.contrib.auth.forms import UserCreationForm
from IspToolboxAccounts.models import User, IspToolboxUserSignUpInfo
from django import forms


class IspToolboxUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True,
        widget=forms.TextInput(attrs={'placeholder': 'name@company.com'}))
    first_name = forms.CharField(required=True,
        widget=forms.TextInput(attrs={'placeholder': 'First Name'}))
    last_name = forms.CharField(required=True,
        widget=forms.TextInput(attrs={'placeholder': 'Last Name'}))

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ['username', 'email', 'first_name', 'last_name']


class IspToolboxUserSignUpInfoForm(forms.ModelForm):
    company_website = forms.CharField(required=True,
        widget=forms.TextInput(attrs={'placeholder': 'www.company.com'}))

    class Meta:
        model = IspToolboxUserSignUpInfo
        exclude = ('owner',)