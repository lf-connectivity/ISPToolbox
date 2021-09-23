from django.contrib.auth.forms import UserCreationForm
from IspToolboxAccounts.models import User, IspToolboxUserSignUpInfo
from django import forms
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm
from django.conf import settings


class IspToolboxUserCreationForm(UserCreationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].help_text = _(
            'Use 8 or more characters with a mix of letters and numbers.')
        self.fields['password2'].help_text = _('')
        self.fields['password1'].label = "Password"
        self.fields['password2'].label = "Repeat Password"
        self.fields['password1'].label_suffix = ""
        self.fields['password2'].label_suffix = ""

    email = forms.EmailField(
        label="Email",
        label_suffix="",
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'name@company.com'}))
    first_name = forms.CharField(
        label="First Name",
        label_suffix="",
        required=True)
    last_name = forms.CharField(
        label="Last Name",
        label_suffix="",
        required=True)

    registration_code = forms.CharField(
        label="Registration Code",
        required=True,
        widget=forms.TextInput(
            attrs={'placeholder': 'Company Provided Registration Code'})
    ) if not settings.ENABLE_ACCOUNT_CREATION else ''

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ['email', 'first_name', 'last_name']

    error_css_class = "error"
    required_css_class = "required"


class IspToolboxUserAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs.update({
            'name': 'email'
        })
        self.fields['password'].label = "Password"
        self.fields['password'].label_suffix = ""

    username = forms.EmailField(
        label="Email",
        label_suffix="",
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'name@company.com'}))

    error_css_class = "error"
    required_css_class = "required"


class IspToolboxUserSignUpInfoForm(forms.ModelForm):
    company_website = forms.URLField(
        label="Company Website",
        label_suffix="",
        required=True,
        error_messages={'required': 'Please enter your company\'s website'},
        widget=forms.TextInput(attrs={'placeholder': 'www.company.com'}))
    business_type = forms.MultipleChoiceField(
        label="What technology do you use to service customers?",
        label_suffix="",
        required=False,
        widget=forms.CheckboxSelectMultiple,
        choices=IspToolboxUserSignUpInfo.BUSINESS_TYPES)
    individual_role = forms.MultipleChoiceField(
        label="What is your role?",
        label_suffix="",
        required=False,
        widget=forms.CheckboxSelectMultiple,
        choices=IspToolboxUserSignUpInfo.ROLE_CHOICES)
    subscriber_size = forms.ChoiceField(
        label="Subscriber Size",
        label_suffix="",
        required=False,
        widget=forms.Select,
        choices=IspToolboxUserSignUpInfo.SUBSCRIBER_SIZE_CHOICES)
    company_goal = forms.MultipleChoiceField(
        label="What are your business goals this year?",
        label_suffix="",
        required=False,
        widget=forms.CheckboxSelectMultiple,
        choices=IspToolboxUserSignUpInfo.GOAL_CHOICES)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    class Meta:
        model = IspToolboxUserSignUpInfo
        exclude = ('owner',)
        labels = {
        }
        help_texts = {
        }

    field_order = [
        'company_website', 'business_type', 'individual_role', 'subscriber_size', 'company_goal'
    ]
    error_css_class = "error"
    required_css_class = "required"


class IspToolboxUserPasswordChangeForm(PasswordChangeForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['new_password1'].help_text = _(
            'Use 8 or more characters with a mix of letters and numbers.')
        self.fields['new_password1'].label = "New Password"
        self.fields['new_password2'].label = "Repeat New Password"
        self.fields['new_password1'].label_suffix = ""
        self.fields['new_password2'].label_suffix = ""


class IspToolboxUserInfoChangeForm(forms.ModelForm):
    class Meta:
        fields = ['email', 'first_name', 'last_name']
        model = User


class IspToolboxUserDeleteAccountForm(forms.Form):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['confirmation'].help_text = _(
            'Type `permanently delete` to confirm')

    confirmation = forms.CharField(
        required=True,
        widget=forms.TextInput(attrs={'placeholder': 'permanently delete'}))
    confirmation_code_value = 'permanently delete'

    def clean(self):
        valid_input = self.cleaned_data.get(
            'confirmation') == self.confirmation_code_value
        if not valid_input:
            self.add_error('confirmation', 'incorrect confirmation code')

    def try_delete(self, request):
        request.user.delete()


class IspToolboxAccessDataForm(forms.Form):
    pass
