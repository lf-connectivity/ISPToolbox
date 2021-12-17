from django import template


register = template.Library()


# Done here so we don't have to do this in templates 100000 times
@register.simple_tag
def unit_preference_value(unit, imperial_value, metric_value):
    if unit == 'IMPERIAL':
        return imperial_value
    else:
        return metric_value