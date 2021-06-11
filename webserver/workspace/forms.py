from django import forms
from django.core import validators


class CustomFileInput(forms.FileInput):
    template_name = "workspace/atoms/fileupload.html"


class UploadTowerCSVForm(forms.Form):
    file = forms.FileField(
        widget=CustomFileInput(
            attrs={'accept': '.csv'},
        ),
        validators=[validators.FileExtensionValidator(['csv'])]
    )


class NewWorkspaceSessionForm(forms.Form):
    name = forms.CharField(
        max_length=63,
        label="Name",
        label_suffix="",
        widget=forms.TextInput(attrs={'placeholder': 'Session Name'}))


class NewWorkspaceSessionFromKMZForm(forms.Form):
    name = forms.CharField(
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
    name = forms.CharField(
        max_length=63,
        label="Name",
        label_suffix="",
        widget=forms.TextInput(attrs={'placeholder': 'Session Name'}))
    create_copy = forms.BooleanField(required=False)


def WorkspaceForms(request):
    return {
        'new_session': NewWorkspaceSessionForm(),
        'new_session_from_kmz': NewWorkspaceSessionFromKMZForm(),
        'save_as_session': SaveAsSessionForm(),
    }
