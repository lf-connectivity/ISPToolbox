# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.core.management.base import BaseCommand
from allauth.socialaccount.models import SocialApp
from django.conf import settings


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating Facebook Social App')
        sapp, created = SocialApp.objects.get_or_create(
            provider='facebook',
            name='ISP Toolbox',
            client_id=settings.SOCIAL_AUTH_FACEBOOK_KEY,
            secret=settings.SOCIAL_AUTH_FACEBOOK_SECRET,
        )
        sapp.save()
        self.stdout.write('created social app' if created else 'social app exists already')
        sapp.sites.add(settings.SITE_ID)
