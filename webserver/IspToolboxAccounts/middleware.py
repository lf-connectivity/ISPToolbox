# (c) Meta Platforms, Inc. and affiliates. Copyright
from IspToolboxAccounts.models import PageVisit
import logging


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def logpagevisit(get_response):
    # One-time configuration and initialization.

    def middleware(request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.
        pv = PageVisit(
            user=request.user if not request.user.is_anonymous else None,
            session_id=request.session.session_key,
            request=(request.path[:253] + '..') if len(request.path) > 255 else request.path,
            ip=get_client_ip(request),
            useragent=request.META.get('HTTP_USER_AGENT')
        )
        response = get_response(request)
        # Code to be executed for each request/response after
        # the view is called.
        pv.response_code = response.status_code
        try:
            pv.save()
        except Exception as e:
            logging.error(f'failed to log page visit {e}')
        return response

    return middleware
