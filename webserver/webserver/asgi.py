"""
ASGI config for deep_gis project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.0/howto/deployment/asgi/
"""
import os

from django.core.asgi import get_asgi_application

# Fetch Django ASGI application early to ensure AppRegistry is populated
# before importing consumers and AuthMiddlewareStack that may import ORM
# models.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webserver.settings')
django_asgi_app = get_asgi_application()

from channels.auth import AuthMiddlewareStack # noqa
from channels.routing import ProtocolTypeRouter, URLRouter # noqa
import mmwave.routing # noqa
import NetworkComparison.routing # noqa

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            mmwave.routing.websocket_urlpatterns +
            NetworkComparison.routing.websocket_urlpatterns
            # add additional urlpatterns to this array with ' + \'
        )
    ),
})
