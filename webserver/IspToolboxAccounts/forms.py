from django.contrib.auth.forms import UserCreationForm
from IspToolboxAccounts.models import User, IspToolboxUserSignUpInfo
from django import forms
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.forms import AuthenticationForm


class IspToolboxUserCreationForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].help_text = _('Use 8 or more characters with a mix of letters and numbers.')
        self.fields['password2'].help_text = _('Enter the same password as before, for verification.')

    email = forms.EmailField(
                required=True,
                widget=forms.TextInput(attrs={'placeholder': 'name@company.com'}))
    first_name = forms.CharField(
                required=True,
                widget=forms.TextInput(attrs={'placeholder': 'First Name'}))
    last_name = forms.CharField(
                required=True,
                widget=forms.TextInput(attrs={'placeholder': 'Last Name'}))

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ['email', 'first_name', 'last_name']


class IspToolboxUserAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({
            'name': 'email'
        })


class IspToolboxUserSignUpInfoForm(forms.ModelForm):
    company_website = forms.CharField(
                required=True,
                widget=forms.TextInput(attrs={'placeholder': 'www.company.com'}))

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        checkboxes = [
            'is_business_role', 'is_tech_role', 'is_sales_role',
            'is_goal_start', 'is_goal_acquire_customers', 'is_goal_expand'
        ]
        for field in checkboxes:
            self.fields[field].modifycheckbox = True

    class Meta:
        model = IspToolboxUserSignUpInfo
        exclude = ('owner',)
        labels = {
            'company_size': _('Subscriber Size'),
            'is_business_role': _('Business & Finance'),
            'is_tech_role': _('Tech & Installation'),
            'is_sales_role': _('Marketing & Sales'),
            'is_goal_start': _('Start an ISP Business'),
            'is_goal_acquire_customers': _('Acquire more customers'),
            'is_goal_expand': _('Expand service to new areas')
        }
        help_texts = {
            'company_size': _('This will help us determine what features to build next')
        }

    field_order = [
        'company_website', 'is_business_role', 'is_tech_role', 'is_sales_role', 'company_size',
        'is_goal_start', 'is_goal_acquire_customers', 'is_goal_expand'
    ]
