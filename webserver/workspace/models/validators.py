from django.core.exceptions import ValidationError


def validate_zoom_level(zoom):
    if zoom <= 0:
        raise ValidationError('Zoom must be a positive number')
    elif zoom > 20:
        raise ValidationError('Zoom must be less than 20')
