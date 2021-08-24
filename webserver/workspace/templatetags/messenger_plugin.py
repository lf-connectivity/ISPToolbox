from django import template
from django.conf import settings

register = template.Library()


# settings value
@register.simple_tag
def fb_page_id():
    return getattr(settings, 'FB_PAGE_ID', "")
