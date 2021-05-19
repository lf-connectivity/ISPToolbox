from django.db import models
from django.conf import settings
import uuid
import redis
import secrets
import time
import json


class MultiplayerSession(models.Model):
    """
    Multiplayer session
    """
    session_id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        unique=True
    )
    users = models.ManyToManyField(settings.AUTH_USER_MODEL)

    def storeUserAuthSession(self, user):
        r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
        # TODO: achong this token should be model backed to avoid collisions
        token = secrets.token_urlsafe(50)
        val = {
            'user': str(user.id),
            'session': str(self.session_id),
            'name': user.first_name,
            'token': token
        }
        r.set(
            f'multiplayer-auth-{token}',
            json.dumps(val),
            ex=int(time.time() + 3600)
        )
        return token
