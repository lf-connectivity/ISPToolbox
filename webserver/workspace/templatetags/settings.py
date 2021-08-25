from django import template
from django.conf import settings

register = template.Library()


# settings value - be careful not to expose any secrets through this template tag
@register.simple_tag
def settings_value(key):
    return getattr(settings, key, "")
