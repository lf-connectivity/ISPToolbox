# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.template import Library
from django.utils.safestring import mark_safe
from IspToolboxAccounts.models import NewUserExperience
from django import template

register = Library()


@register.simple_tag
def user_nux_value(user, nux: NewUserExperience):
    return nux.users.filter(id=user.id).exists()


class ShowUserNux(template.Node):
    def __init__(self, nux: str, nodelist):
        self.nux = nux
        self.nodelist = nodelist

    def render(self, context):
        request = context.get('request')
        if request is not None:
            try:
                nux = NewUserExperience.objects.get(name=self.nux)
                if request.user.is_anonymous:
                    if not nux.anonymous_sessions.filter(session_key=request.session.session_key).exists():
                        nux.anonymous_sessions.add(request.session.session_key)
                        return self.nodelist.render(context)
                    else:
                        return ''
                if not nux.users.filter(id=request.user.id).exists():
                    nux.users.add(request.user)
                    return self.nodelist.render(context)
            except Exception:
                return ''
        return ''


@register.tag(name="show_nux")
def show_nux(parser, token):
    nodelist = parser.parse(('endnux',))
    try:
        tag_name, nux = token.split_contents()
    except Exception as e:
        raise(e)
    parser.delete_first_token()
    return ShowUserNux(nux, nodelist)


@register.simple_tag
def user_nux_value_input(user, nux: NewUserExperience):
    return mark_safe(
        f"""<input type="checkbox" name="seen"
        {"checked" if nux.users.filter(id=user.id).exists() else None}
        onChange="submit();"
        form="{nux.id}_{nux.name}">"""
    )
