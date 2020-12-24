from django.core.management.base import BaseCommand
from allauth.socialaccount.models import SocialApp


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating Facebook Social App')
        sapp, created = SocialApp.objects.get_or_create(
            provider='facebook',
            name='ISP Toolbox',
        )
        sapp.save()
        self.stdout.write('created social app' if created else 'social app exists already')
        sapp.sites.add(3)
