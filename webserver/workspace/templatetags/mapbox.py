from django import template
from django.conf import settings

register = template.Library()


# settings value
@register.simple_tag
def mapbox_public_key():
    return getattr(settings, 'MAPBOX_PUBLIC_TOKEN', "")
