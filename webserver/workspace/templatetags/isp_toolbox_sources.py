from django import template
from django.utils.html import format_html

from collections import OrderedDict

from workspace.utils.sources import get_source

import re

register = template.Library()

CITATION_HTML_FORMAT_STRING_LINK = """
    <a href="{}">
        {}
    </a>
"""

CITATION_HTML_FORMAT_STRING = """
    <sup>
        <span class="footnote--bracket">[</span>{}<span class="footnote--bracket">]</span>
    </sup>
"""


class _CitationNode(template.Node):
    def __init__(self, nodelist, sources, params):
        self.nodelist = nodelist
        self.sources = sources
        self.id = params['id']
        self.do_render = params['render']
        self.href = params['href']

    def render(self, context):
        # Simple id resolver, variable names or quoted strings only!!!
        if re.match('^\'.*\'$', self.id) or re.match('^\".*\"$', self.id):
            id = self.id[1:-1]
        else:
            id = context[self.id]
        
        # Simple render resolver, variable names or True/False only
        if self.do_render == 'True':
            do_render = True
        elif self.do_render == 'False':
            do_render = False
        else:
            do_render = bool(context.get(self.do_render, False))

        # Simple href resolver, var names or string only
        if self.href:
            if re.match('^\'.*\'$', self.href) or re.match('^\".*\"$', self.href):
                href = self.href[1:-1]
            else:
                href = context.get(self.href, None)
        else:
            href = None

        sources = context[self.sources]

        # Render footnote for later
        sources[id] = self.nodelist.render(context)
        index = list(sources).index(id) + 1
        if not do_render:
            return ''
        else:
            citation = format_html(CITATION_HTML_FORMAT_STRING, index)

            if href:
                return format_html(CITATION_HTML_FORMAT_STRING_LINK, href, citation)
            else:
                return citation


@register.simple_tag
def new_sources_list():
    """
    Instantiates a new list of sources. This should be invoked and stored as a
    template variable at the beginning of the template.
    """
    return OrderedDict()


@register.tag
def citation(parser, token):
    """
    Adds a new citation footnote to the source. Usage is as follows:

    ```
    {% citation source id="MY ID" render=False  %}
        <footnote text goes here>
    {% endcitation %}
    ```
    This citation will be automatically numbered in order of inclusion.
    Returns a superscripted citation for where in the eventual sources list the footnote will be.

    Required Parameters:
        - `sources`: List of sources
    
    Required Parameters (in kwargs):
        - `id`: Unique ID for the disclaimer (should be different than those for
                sources too).
    
    Optional Parameters:
        - `render`: Whether or not to render the citation. Default to `True`.
        - `href`: A link to the footnote section (or page). If not there, won't render as a link.
    """
    # Find the id.
    try:
        tokens = token.split_contents()
        sources = tokens[1]
        kwargs = tokens[2:]
        params = {
            'id': None,
            'render': 'True',
            'href': None
        }
        for kwarg in kwargs:
            param, value = kwarg.split('=')
            params[param] = value

        if not params['id']:
            raise template.TemplateSyntaxError('Missing id.')

    except IndexError:
        raise template.TemplateSyntaxError(f'{token.split_contents()[0]} requires at least two arguments')
    except KeyError as err:
        raise template.TemplateSyntaxError(f'{err} is not a valid parameter')

    nodelist = parser.parse(('endcitation',))
    parser.delete_first_token()
    return _CitationNode(nodelist, sources, params)


@register.simple_tag
def existing_citation(sources, id, href=None):
    """
    Template tag for citing an already cited source.
    """
    if id not in sources:
        raise template.TemplateSyntaxError(f'{id} not in sources.')

    index = list(sources).index(id) + 1
    return format_html(CITATION_HTML_FORMAT_STRING, index)


@register.simple_tag
def source_link(country, source_id):
    """
    Creates a link to the given source, sorted by country and source ID. Will link
    to the link given in the source, with the given title.
    """
    source_info = get_source(country, source_id)
    link_href = source_info.link
    link_text = source_info.title
    return format_html(
        f'<a href="{link_href}">{link_text}</a>'
    )


@register.simple_tag
def source_last_updated(country, source_id):
    """
    Creates text for the date of last update for the given source, by country
    and source ID. Will look like `[Last Updated <last_updated>]`
    """
    source_info = get_source(country, source_id)
    return f'[Last Updated {source_info.last_updated}]'


@register.inclusion_tag('workspace/atoms/components/footnote_section.html')
def footnote_section(sources, **kwargs):
    """
    Renders the footnote section, with sources defined by `sources`.

    Parameters:
        - `sources`: List of sources

    Optional Parameters:
        - `id`: ID of the foothote section
        - `ol_classes`: Class attribute for the `<ol>` element
        - `ol_style`: Style attribute for the `<ol>` element
        - `li_classes`: Class attribute for the `<li>` elements
        - `li_style`: Style attribute for the `<li>` elements
    """
    if isinstance(sources, OrderedDict):
        source_list = sources.values()
    else:
        source_list = sources

    return {
        'sources': source_list,
        'ol_classes': kwargs.get('ol_classes', ''),
        'ol_style': kwargs.get('ol_style', ''),
        'li_classes': kwargs.get('li_classes', ''),
        'li_style': kwargs.get('li_style', '')
    }
