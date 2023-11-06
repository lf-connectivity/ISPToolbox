# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.utils.translation import gettext as _
from rest_framework.status import HTTP_200_OK

from mapbox import Geocoder

from webserver import settings

import international_address_formatter
import pystache
import yaml
import os


_MAPBOX_TO_ADDRESS_FORMATTER_COMPONENTS = {
    "country": "country",
    "region": "state",
    "postcode": "postcode",
    "district": "state_district",
    "place": "city",
    "locality": "city_district",
    "neighborhood": "neighbourhood",
    "address": "road",
}


# AddressFormatter is bugged, but nobody is accepting any PRs :(
# See PR: https://github.com/dunkelstern/international_address_formatter/pull/3
class _UTF8AddressFormatter(international_address_formatter.AddressFormatter):
    def __init__(self):
        file_dir = os.path.dirname(
            os.path.abspath(international_address_formatter.__file__)
        )
        config = os.path.abspath(os.path.join(file_dir, "data/worldwide.yml"))

        with open(config, "r", encoding="latin-1") as f:
            contents = f.read().encode("utf-8")

            # Exceptionally dangerous but we trust this file input so it should be ok :)
            self.model = yaml.load(contents, Loader=yaml.FullLoader)

    def _get_country_format(self, country_code):
        search_key = country_code.upper() if country_code is not None else "default"
        fmt = self.model.get(search_key, None)
        if fmt is None:
            fmt = self.model.get("default", None)
        if fmt is None:
            raise RuntimeError(
                "Configuration file for address formatter has no default value!"
            )

        return fmt

    def format(self, address, country_code=None):
        fmt = self._get_country_format(country_code)

        cleaned_address = {}
        for key, value in address.items():
            if value is not None:
                cleaned_address[key] = value

        # Add support for use_country, change_country, and add_component
        if "change_country" in fmt:
            cleaned_address["country"] = fmt["change_country"]
        if "add_component" in fmt:
            k, v = fmt["add_component"].split("=", 2)
            cleaned_address[k] = v
        if "use_country" in fmt:
            fmt = self._get_country_format(fmt["use_country"])

        # TODO: add support for postformat_replace (need for BR)

        cleaned_address["first"] = international_address_formatter.format.first(
            cleaned_address
        )
        return pystache.render(fmt["address_template"], cleaned_address).strip()


def _process_component(response_component):
    address_components = {}
    if "id" in response_component:
        mapbox_component_type = response_component["id"].split(".")[0]
        if mapbox_component_type in _MAPBOX_TO_ADDRESS_FORMATTER_COMPONENTS:
            component_type = _MAPBOX_TO_ADDRESS_FORMATTER_COMPONENTS[
                mapbox_component_type
            ]
            address_components[component_type] = response_component["text"]

            # Addresses might have house number
            if component_type == "road" and "address" in response_component:
                address_components["house_number"] = response_component["address"]

    return address_components


def _reverse_geocode(lat, long):
    address_components = {"road": _("Undetected Street Address")}
    response = _geocoder.reverse(lon=long, lat=lat)
    if response.status_code == HTTP_200_OK:
        best_fit = response.geojson()["features"][0]
        address_components.update(_process_component(best_fit))

        # Process response into address components
        if "context" in best_fit:
            for item in best_fit["context"]:
                address_components.update(_process_component(item))

        return address_components


_geocoder = Geocoder(access_token=settings.MAPBOX_ACCESS_TOKEN_PUBLIC)
_address_formatter = _UTF8AddressFormatter()
