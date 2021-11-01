"""
ASGI config for ISP Toolbox Project

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/howto/deployment/asgi/
"""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "webserver.settings")

from django.core.wsgi import get_wsgi_application # noqa

application = get_wsgi_application()

from channels.auth import AuthMiddlewareStack # noqa
from channels.security.websocket import AllowedHostsOriginValidator # noqa
from channels.routing import ProtocolTypeRouter, URLRouter # noqa
from IspToolboxApp.routing import websocket_urlpatterns as ispt_urls # noqa
from mmwave.routing import websocket_urlpatterns as mmwave_urls # noqa
from NetworkComparison.routing import websocket_urlpatterns as nc_urls # noqa


application = ProtocolTypeRouter({
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(
                ispt_urls +
                mmwave_urls +
                nc_urls
                # add additional urlpatterns to this array with ' + \'
            )
        )
    ),
})
