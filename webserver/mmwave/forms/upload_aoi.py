from django import forms
from django.core import validators
import json
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import createGeoJsonsFromKML
from defusedxml import ElementTree
from mmwave.models.dsm_models import DSMException


class DSMExportAOIFileForm(forms.Form):
    validate_file = validators.FileExtensionValidator(['geojson', 'kml'])
    file = forms.FileField(validators=[validate_file])

    def convertToAOI(self):
        file_submitted = self.files.get('file', None)
        if file_submitted.name.endswith('geojson'):
            # Load geojson from file and create AOI
            geojson = json.load(file_submitted)
            geojson_type = geojson.get('type', None)
            if (
                    isinstance(geojson_type, str) and (
                        geojson_type.lower() == 'featurecollection' or
                        geojson_type.lower == 'feature')
                    ):
                raise DSMException('GeoJSON cannot be type FeatureCollection or Feature')
            return geojson
        elif file_submitted.name.endswith('kml'):
            kmlfile = ElementTree.parse(file_submitted)
            geometries = createGeoJsonsFromKML(kmlfile)
            return {
                "type": "GeometryCollection",
                "geometries": geometries
            }
        else:
            return None
