from django import forms
from django.core import validators
from workspace.models import WorkspaceMapSession
from django.utils.translation import gettext_lazy as _


class CustomFileInput(forms.FileInput):
    template_name = "workspace/atoms/fileupload.html"


class UploadTowerCSVForm(forms.Form):
    file = forms.FileField(
        widget=CustomFileInput(
            attrs={'accept': '.csv'},
        ),
        validators=[validators.FileExtensionValidator(['csv'])]
    )


class WorkspaceSessionForm(forms.ModelForm):
    class Meta:
        model = WorkspaceMapSession
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={'placeholder': 'Session Name'}),
        }
        labels = {
            'name': _('Name'),
        }


class NewWorkspaceSessionFromKMZForm(forms.Form):
    new_session_file_import_name = forms.CharField(
        max_length=63,
        label="Save Session as",
        label_suffix="",
        widget=forms.TextInput(attrs={'placeholder': 'Session Name'}))
    kmz = forms.FileField(
        widget=CustomFileInput(
            attrs={'accept': 'application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz, .geojson'},
        ),
        validators=[validators.FileExtensionValidator(['geojson', 'kml', 'kmz'])]
    )


class SaveAsSessionForm(forms.Form):
    save_as_session_name = forms.CharField(
        max_length=63,
        label="Name",
        label_suffix="",
        widget=forms.TextInput(attrs={'placeholder': 'Session Name'}))


def WorkspaceForms(request, session):
    return {
        'new_session': WorkspaceSessionForm(),
        'new_session_from_kmz': NewWorkspaceSessionFromKMZForm(),
        'save_as_session': SaveAsSessionForm(),
        'rename_session': WorkspaceSessionForm(instance=session, auto_id='id_rename_%s'),
    }
