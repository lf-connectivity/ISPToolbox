from django import template
from django.utils.html import format_html

from collections import OrderedDict

from workspace.utils.sources import get_source

register = template.Library()

CITATION_TYPE_REGULAR = 'Citation'
CITATION_TYPE_SOURCE = 'Source'

CITATION_HTML_FORMAT_STRING = """
    <sup>
        <span class="footnote--bracket">[</span>{}<span class="footnote--bracket">]</span>
    </sup>
"""


class _CitationNode(template.Node):
    def __init__(self, nodelist, sources, id):
        self.nodelist = nodelist
        self.sources = sources
        self.id = id

    def render(self, context):
        # Simple id resolver, variable names or quoted strings only!!!
        if (self.id[0] == '"' and self.id[-1] == '"') or (self.id[0] == self.id[-1] and self.id[0] == '\''):
            id = self.id[1:-1]
        else:
            self.id = context[self.id]

        sources = context[self.sources]

        # Render footnote for later
        sources[id] = self.nodelist.render(context)
        index = list(sources).index(id) + 1
        return format_html(CITATION_HTML_FORMAT_STRING, index)


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
    {% citation source "MY ID" %}
        <footnote text goes here>
    {% endcitation %}
    ```
    This citation will be automatically numbered in order of inclusion.
    Returns a superscripted citation for where in the eventual sources list the footnote will be.

    Parameters:
        - `sources`: List of sources
        - `id`: Unique ID for the disclaimer (should be different than those for
                sources too)
    """
    # Find the id.
    try:
        _, sources, id = token.split_contents()
    except ValueError:
        raise template.TemplateSyntaxError(f'{token.split_contents()[0]} requires two arguments')

    nodelist = parser.parse(('endcitation',))
    parser.delete_first_token()
    return _CitationNode(nodelist, sources, id)


@register.inclusion_tag('workspace/atoms/components/citation.html')
def existing_citation(sources, id):
    """
    Template tag for citing an already cited source.
    """
    if id not in sources:
        raise template.TemplateSyntaxError(f'{id} not in sources.')

    index = list(sources).index(id) + 1
    return {
        'index': index
    }


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
