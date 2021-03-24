from django import forms
from django.core import validators
from workspace.models import Network


class NetworkForm(forms.ModelForm):
    class Meta:
        model = Network
        fields = ['name']


class UploadTowerCSVForm(forms.Form):
    validate_file = validators.FileExtensionValidator(['csv'])
    file = forms.FileField(validators=[validate_file])
