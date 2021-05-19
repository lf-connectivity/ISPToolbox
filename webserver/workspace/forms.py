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
    name = forms.CharField(max_length=255)


class NewWorkspaceSessionFromKMZForm(forms.Form):
    name = forms.CharField(max_length=255)
    kmz = forms.FileField(
        widget=CustomFileInput(
            attrs={'accept': 'application/vnd.google-earth.kml+xml, application/vnd.google-earth.kmz, .geojson'},
        ),
        validators=[validators.FileExtensionValidator(['geojson', 'kml', 'kmz'])]
    )


class SaveAsSessionForm(forms.Form):
    name = forms.CharField(max_length=255)
    create_copy = forms.BooleanField(required=False)


def WorkspaceForms(request):
    return {
        'new_session': NewWorkspaceSessionForm(),
        'new_session_from_kmz': NewWorkspaceSessionFromKMZForm(),
        'save_as_session': SaveAsSessionForm(),
    }
