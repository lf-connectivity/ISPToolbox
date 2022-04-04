from django import forms
from workspace import models as workspace_models
from workspace.models.network_models import AccessPointLocation


class ModelFormUnitsMixin:
    """
    This mixin is used for ModelForm's with fields that have units (e.g. km, mi, ft)
    """
    def __init__(self, *args, **kwargs):
        instance = kwargs.get('instance', None)
        if instance.get_units == workspace_models.WorkspaceMapSession.UnitPreferences.IMPERIAL:
            kwargs['initial'].update(
                {
                    field: getattr(instance, field_properties['imperial_name'])
                    for field, field_properties in self.imperial_fields.items()
                }
            )
        super().__init__(*args, **kwargs)

    def save(self, *args, **kwargs):
        if self.instance.get_units == workspace_models.WorkspaceMapSession.UnitPreferences.IMPERIAL:
            for field, field_properties in self.imperial_fields.items():
                setattr(self.instance, field_properties['imperial_name'], self.cleaned_data[field])
        return super().save(*args, **kwargs)


class AccessPointLocationModalForm(ModelFormUnitsMixin, forms.ModelForm):
    coordinates = forms.CharField(label="Coordinates", validators=[AccessPointLocation.coordinates_validator])
    imperial_fields = {
        'height': {'imperial_name': 'height_ft'},
        'max_radius': {'imperial_name': 'radius_miles'},
    }
    units_metric = {
        'height': 'm',
        'max_radius': 'km',
    }
    units_imperial = {
        'height': 'ft',
        'max_radius': 'mi'
    }

    def __init__(self, *args, **kwargs):
        instance = kwargs.get('instance', None)
        kwargs.setdefault('label_suffix', '')
        if instance:
            kwargs['initial'] = {'coordinates': instance.coordinates}
        super().__init__(*args, **kwargs)

    def save(self, *args, **kwargs):
        self.instance.coordinates = self.cleaned_data['coordinates']
        return super().save(*args, **kwargs)

    class Meta:
        model = workspace_models.AccessPointLocation
        exclude = [
            'owner', 'map_session', 'session', 'uneditable', 'geojson', 'no_check_radius', 'default_cpe_height'
        ]
        help_texts = {}
        labels = {'max_radius': 'Radius', 'height': 'Height'}

    error_css_class = "error"
    required_css_class = "required"


class AccessPointSectorModalForm(ModelFormUnitsMixin, forms.ModelForm):
    imperial_fields = {
        'height': {'imperial_name': 'height_ft'},
        'radius': {'imperial_name': 'radius_miles'},
        'default_cpe_height': {'imperial_name': 'default_cpe_height_ft'}
    }
    units_metric = {
        'height': 'm',
        'radius': 'km',
        'default_cpe_height': 'm',
        'frequency': 'GHz',
    }
    units_imperial = {
        'height': 'ft',
        'radius': 'mi',
        'default_cpe_height': 'ft',
        'frequency': 'GHz',
    }

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('label_suffix', '')
        super().__init__(*args, **kwargs)

    class Meta:
        model = workspace_models.AccessPointSector
        exclude = [
            'owner', 'map_session', 'session', 'uneditable', 'geojson', 'no_check_radius'
        ]
        labels = {
            'radius': 'Distance',
            'default_cpe_height': 'Customer Antenna<br><sub>Height above Rooftop</sub>',
            'height': 'Access Point<br><sub>Height above Ground</sub>'
        }
        help_texts = {}

    # field_order = [ ]
    error_css_class = "error"
    required_css_class = "required"
