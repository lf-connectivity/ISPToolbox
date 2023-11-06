# (c) Meta Platforms, Inc. and affiliates. Copyright
from django import template
from django.utils.html import format_html

from collections import OrderedDict

from workspace.utils.sources import get_source

import enum
import re

register = template.Library()

_CITATION_HTML_FORMAT_STRING_LINK = """
    <sup>
        <a href="{}" target="{}" class="footnote--link">
            <span class="footnote--bracket">[</span>{}<span class="footnote--bracket">]</span>
        </a>
    </sup>
"""

_CITATION_HTML_FORMAT_STRING = """
    <sup>
        <span class="footnote--bracket">[</span>{}<span class="footnote--bracket">]</span>
    </sup>
"""

_VARIABLE_NAME_REGEX = re.compile('^([\w\.]+)$')            # noqa: W605
_STRING_LITERAL_REGEX = re.compile('(^\'.*\'$)|(^\".*\"$)')
_INT_LITERAL_REGEX = re.compile('^(\d+)$')                  # noqa: W605
_KWARG_REGEX = re.compile('^(\w+)=(.+)$')                   # noqa: W605


def _create_citation_html(index, href, footnote_id):
    # href being empty string = same page.
    if href is not None:
        # Open page in new tab unless it's the same page.
        target = '_self' if href == '' else '_blank'
        if footnote_id:
            href += f'#{footnote_id}-{index}'

        return format_html(_CITATION_HTML_FORMAT_STRING_LINK, href, target, index)
    else:
        return format_html(_CITATION_HTML_FORMAT_STRING, index)


class _TokenParserBlockState(enum.Enum):
    NEUTRAL = ''
    AS_BLOCK = 'as'
    WITH_BLOCK = 'with'


class _CitationNode(template.Node):
    def __init__(self, nodelist, sources, params):
        self.nodelist = nodelist
        self.sources = sources
        self.id = params['id']
        self.do_render = params['render']
        self.href = params['href']
        self.footnote_id = params['footnote_id']

    def render(self, context):
        id = _eval_string_literal_or_variable_value(self.id, context)
        do_render = _eval_boolean_literal_or_variable_value(self.do_render, context)
        href = _eval_string_literal_or_variable_value(self.href, context) if self.href else None
        footnote_id = _eval_string_literal_or_variable_value(self.footnote_id, context) if self.footnote_id else None

        sources = context[self.sources]

        # Render footnote for later
        sources[id] = self.nodelist.render(context)
        index = list(sources).index(id) + 1
        if not do_render:
            return ''
        else:
            return _create_citation_html(index, href, footnote_id)


class _NewSourcesListNode(template.Node):
    def __init__(self, var_name):
        self.var_name = var_name

    def render(self, context):
        if self.var_name not in context:
            context[self.var_name] = OrderedDict()
        return ''


class _LoadSourcesListNode(template.Node):
    def __init__(self, page, source_var, new_page_context, as_var):
        self.page = page
        self.source_var = source_var
        self.new_page_context = new_page_context
        self.as_var = as_var

    def render(self, context):
        page = _eval_string_literal_or_variable_value(self.page, context)
        new_sources_list = OrderedDict()
        page_context = template.Context(context)
        page_context[self.source_var] = new_sources_list

        for k, v in self.new_page_context.items():
            page_context[k] = _eval_general_value(v, context)

        t = template.Engine.get_default().get_template(template_name=page)
        c = template.Context(page_context)
        t.render(c)

        if self.as_var:
            context[self.as_var] = new_sources_list
        return ''


def _parse_kwarg_statement(statement):
    match = re.match(_KWARG_REGEX, statement)
    if not match:
        raise template.TemplateSyntaxError(f'Expected kwarg statement, got {statement} instead')
    else:
        return (match.group(1), match.group(2))


def _parse_variable_name_statement(statement):
    if not re.match(_VARIABLE_NAME_REGEX, statement):
        raise template.TemplateSyntaxError(f'Invalid variable name {statement}')
    else:
        return statement


def _parse_string_literal_or_variable_statement(statement):
    if re.match(_STRING_LITERAL_REGEX, statement):
        return statement
    elif re.match(_VARIABLE_NAME_REGEX, statement):
        return statement
    else:
        raise template.TemplateSyntaxError(f'Expected string literal or variable name, got {statement} instead')


def _eval_string_literal_or_variable_value(value, context, default=None):
    if re.match(_STRING_LITERAL_REGEX, value):
        return value[1:-1]
    else:
        return _eval_variable_value(value, context, default)


def _eval_boolean_literal_or_variable_value(value, context, default=False):
    if value == 'True':
        return True
    elif value == 'False':
        return False
    else:
        return bool(_eval_variable_value(value, context, default))


def _eval_general_value(value, context, default=None):
    # Could be string literal, int/boolean literal, or variable
    # eval string literal
    if re.match(_STRING_LITERAL_REGEX, value):
        return value[1:-1]
    elif value == 'True':
        return True
    elif value == 'False':
        return False
    elif re.match(_INT_LITERAL_REGEX, value):
        return int(value)
    else:
        return _eval_variable_value(value, context, default)


def _eval_variable_value(value, context, default=None):
    def __eval(parent, child):
        # Try accessing with .get if context or dict
        if parent is context or isinstance(parent, dict):
            return parent.get(child, default)
        else:
            return getattr(parent, child, default)

    parent = context
    val = None

    for token in value.split('.'):
        val = __eval(parent, token)
        parent = val

    return val


@register.tag
def new_sources_list(parser, token):
    """
    Instantiates a new list of sources. This should be invoked and stored as a
    template variable at the beginning of the template. Usage is as follows:

    ```
    {% new_sources_list as context_var %}
    ```

    Unlike Django simple tags, this variable will not be updated if it is already
    defined.
    """
    body = ' '.join(token.split_contents()[1:])
    match = re.match('^as (\w+)$', body)  # noqa: W605
    if not match:
        raise template.TemplateSyntaxError('Invalid syntax for new_sources_list')

    return _NewSourcesListNode(match.group(1))


@register.tag
def load_sources_from(parser, token):
    """
    Loads the sources list from another page into the current page's context.
    Usage is as follows (brackets are optional syntax):

    ```
    {% load_sources_list_from <page> <source_var> [ with <kwargs> ] [ as <output_var> ] %}
    ```

    Sample usage:
    ```
    {% load_sources_list_from 'test/page.html' source with foo="bar" as sources %}
    ```

    Required Parameters:
        - `page`: The template page to load the sources list from
        - `source_var`: The variable name in the page's context to extract the source list from.
    """

    # Parse page and source_var
    tokens = token.split_contents()
    if len(tokens) < 3:
        raise template.TemplateSyntaxError('Missing page and/or source_var parameters')

    page = _parse_string_literal_or_variable_statement(tokens[1])
    source_var = _parse_variable_name_statement(tokens[2])

    # Parse with/as blocks, which are optional, using a state machine based parsing implementation
    # NEUTRAL accepts only 'as' or 'with', then goes to either AS_BLOCK or WITH_BLOCK
    # AS_BLOCK only accepts variable names, then goes to NEUTRAL
    # WITH_BLOCK can only go to AS_BLOCK if encountering 'as'; otherwise, it only accepts kwarg statements.
    encountered_states = set([_TokenParserBlockState.NEUTRAL])
    new_page_context = {}
    as_var = None
    parser_state = _TokenParserBlockState.NEUTRAL

    # We should only encounter one WITH and one AS block
    def change_state(new_state):
        nonlocal parser_state

        if new_state != _TokenParserBlockState.NEUTRAL and new_state in encountered_states:
            raise template.TemplateSyntaxError(f'Encountered multiple {new_state.value} blocks.')

        parser_state = new_state
        encountered_states.add(new_state)

    for tok in tokens[3:]:
        if parser_state == _TokenParserBlockState.NEUTRAL:
            if tok == 'as':
                change_state(_TokenParserBlockState.AS_BLOCK)
            elif tok == 'with':
                change_state(_TokenParserBlockState.WITH_BLOCK)
            else:
                raise template.TemplateSyntaxError(f'Expected \'as\' or \'with\', got {tok} instead')

        elif parser_state == _TokenParserBlockState.AS_BLOCK:
            as_var = _parse_variable_name_statement(tok)
            change_state(_TokenParserBlockState.NEUTRAL)

        elif parser_state == _TokenParserBlockState.WITH_BLOCK:
            if tok == 'as':
                change_state(_TokenParserBlockState.AS_BLOCK)
            else:
                var, value = _parse_kwarg_statement(tok)
                new_page_context[var] = value

    return _LoadSourcesListNode(page, source_var, new_page_context, as_var)


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
        - `footnote_id`: Footnote element. If given, link directly to element as opposed to footnote object.
    """
    # Find the id.
    try:
        tokens = token.split_contents()
        sources = _parse_variable_name_statement(tokens[1])
        kwargs = tokens[2:]
        params = {
            'id': None,
            'render': 'True',
            'href': None,
            'footnote_id': None
        }
        for kwarg in kwargs:
            param, value = _parse_kwarg_statement(kwarg)
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
def existing_citation(sources, id, href=None, footnote_id=None):
    """
    Template tag for citing an already cited source.
    """
    if id not in sources:
        raise template.TemplateSyntaxError(f'{id} not in sources.')

    index = list(sources).index(id) + 1
    return _create_citation_html(index, href, footnote_id)


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
        f'<a href="{link_href}" target="_blank">{link_text}</a>'
    )


@register.simple_tag
def source_last_updated(country, source_id, format='[Last Updated <last_updated>]', last_updated_format='%b %Y'):
    """
    Creates text for the date of last update for the given source, by country
    and source ID. Will look like `[Last Updated <last_updated>]`, unless formatted otherwise
    """
    source_info = get_source(country, source_id)
    last_updated = source_info.last_updated.strftime(last_updated_format) if source_info.last_updated else ''
    return format.replace('<last_updated>', last_updated)


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
        'id': kwargs.get('id', ''),
        'ol_classes': kwargs.get('ol_classes', ''),
        'ol_style': kwargs.get('ol_style', ''),
        'li_classes': kwargs.get('li_classes', ''),
        'li_style': kwargs.get('li_style', '')
    }
