from django import template
import pycountry


register = template.Library()


@register.simple_tag
def reverse_geocoded_address_lines(lat, long, include_country=False):
    """
    Provides a list of the lines forming the reverse geocoded lat long's address.
    """
    from .address_format_utils import _reverse_geocode, _address_formatter
    
    address_components = _reverse_geocode(lat, long)
    country_code = pycountry.countries.get(name=address_components["country"]).alpha_2
    lines = _address_formatter.format(
        address_components, country_code=country_code
    ).split("\n")
    if not include_country:
        lines = lines[:-1]
    return lines
