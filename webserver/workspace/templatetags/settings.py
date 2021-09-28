from django import template
from django.conf import settings

register = template.Library()


# settings value - be careful not to expose any secrets through this template tag
@register.simple_tag
def settings_value(key):
    return getattr(settings, key, "")


class ProdFlag(template.Node):
    def __init__(self, nodelist):
        self.nodelist = nodelist

    def render(self, context):
        if settings.PROD:
            return self.nodelist.render(context)
        return ''


@register.tag(name="onlyprod")
def onlyprod(parser, token):
    nodelist = parser.parse(('endonlyprod',))
    parser.delete_first_token()
    return ProdFlag(nodelist)
