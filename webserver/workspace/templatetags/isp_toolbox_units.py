from django import template
from django.utils.html import format_html

import math

register = template.Library()

_HTML_OPTION = """
    <option value="{}">{} GHz</option>
"""

_HTML_OPTION_SELECTED = """
    <option value="{}" selected>{} GHz</option>
"""


# Done here so we don't have to do this in templates 100000 times
@register.simple_tag
def unit_preference_value(unit, imperial_value, metric_value):
    if unit == 'IMPERIAL':
        return imperial_value
    else:
        return metric_value


@register.simple_tag
def frequency_dropdown_option(frequency, option_value, option_text):
    if math.isclose(frequency, option_value):
        return format_html(_HTML_OPTION_SELECTED, option_value, option_text)
    else:
        return format_html(_HTML_OPTION, option_value, option_text)
