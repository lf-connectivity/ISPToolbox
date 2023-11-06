# (c) Meta Platforms, Inc. and affiliates. Copyright
from django import template

import math
from workspace.models.model_constants import FREQUENCY_CHOICES, ModelLimits
from workspace import models as workspace_models

register = template.Library()


# Done here so we don't have to do this in templates 100000 times
@register.simple_tag
def unit_preference_value(unit, imperial_value, metric_value):
    if unit == workspace_models.WorkspaceMapSession.UnitPreferences.IMPERIAL:
        return imperial_value
    else:
        return metric_value


@register.simple_tag
def form_get_units(form, field):
    if form.instance.get_units == workspace_models.WorkspaceMapSession.UnitPreferences.IMPERIAL:
        return form.units_imperial.get(field.name, '')
    else:
        return form.units_metric.get(field.name, '')


@register.simple_tag
def field_limit(limit_name, limit_type, truncate=None):
    limit = getattr(getattr(ModelLimits, limit_name.upper()), limit_type.lower())
    if truncate is not None:
        multiplier = 10 ** truncate
        limit = math.floor(limit * multiplier) / multiplier
    return limit


@register.simple_tag
def frequency_list():
    """
    Returns a dictionary of frequency shorthands and their actual float values
    """

    return dict((label, value) for value, label in FREQUENCY_CHOICES)


@register.filter
def to_frequency_label(frequency):
    return dict(FREQUENCY_CHOICES)[frequency]
