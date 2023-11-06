# (c) Meta Platforms, Inc. and affiliates. Copyright
from django import template
from django.core.exceptions import ObjectDoesNotExist
from django.utils.html import format_html_join
from django.utils.module_loading import import_string

register = template.Library()


_DUMP_FORMAT_STRING = """
    <p style="font-family: monospace">{}: {}</p>
"""


def _dump_serializer_data(serializer_data, serializer_fields):
    for k in serializer_data:
        if not serializer_fields or k in serializer_fields:
            if isinstance(serializer_data[k], dict):
                yield (k, serializer_data[k]["uuid"])
            else:
                yield (k, serializer_data[k])


@register.simple_tag
def workspace_feature_dump(serializer_class_path, uuid, fields=None):
    try:
        serializer_class = import_string(serializer_class_path)
        model_cls = serializer_class.Meta.model
        instance = model_cls.objects.get(uuid=uuid)
        serializer = serializer_class(instance=instance)
        serializer_fields = [f.strip() for f in fields.split(",")] if fields else None

        return format_html_join(
            "\n",
            _DUMP_FORMAT_STRING,
            _dump_serializer_data(serializer.data, serializer_fields),
        )

    except (ImportError, ObjectDoesNotExist):
        return ""
