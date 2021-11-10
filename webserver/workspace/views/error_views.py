from django.http.response import Http404
from django.shortcuts import render
from django.core.exceptions import PermissionDenied


def Error500View(request, **kwargs):
    context = {
        'error_title': 'An error occured',
        'error_msg': 'Sorry, your request could not be processed.'
    }
    return render(request, 'workspace/error.html', context, status=500)


def Error404View(request, exception, **kwargs):
    context = {
        'error_title': 'Page not found',
        'error_msg': 'Sorry, the page you\'re looking for doesn\'t exist or may have moved.'
    }
    return render(request, 'workspace/error.html', context, status=404)


def Error403View(request, exception, **kwargs):
    context = {
        'error_title': 'Forbidden',
        'error_msg': 'Sorry, you\'re not authorized to perform that request'
    }
    return render(request, 'workspace/error.html', context, status=403)


def AdminGeneric403View(request, **kwargs):
    """
    404 if user is superuser - else raise 403
    """
    if request.user.is_superuser:
        raise Http404
    raise PermissionDenied
