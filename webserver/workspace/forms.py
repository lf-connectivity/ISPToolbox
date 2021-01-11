from django import forms
from workspace.models import Network


class NetworkForm(forms.ModelForm):
    class Meta:
        model = Network
        fields = ['name']
