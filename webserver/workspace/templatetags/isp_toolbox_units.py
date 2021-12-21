from django import template
from django.utils.html import format_html

import math
from workspace.models.model_constants import ModelLimits

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
    if unit == "IMPERIAL":
        return imperial_value
    else:
        return metric_value


@register.simple_tag
def field_limit(limit_name, limit_type, truncate=None):
    limit = getattr(getattr(ModelLimits, limit_name.upper()), limit_type.lower())
    if truncate is not None:
        multiplier = 10 ** truncate
        limit = math.floor(limit * multiplier) / multiplier
    return limit
