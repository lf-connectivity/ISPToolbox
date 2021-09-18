from django.core.management.base import BaseCommand
from IspToolboxAccounts.models import NewUserExperience


DEFAULT_NUXES = [
    'market_nux',
    'network_nux',
    'market_disclaimer',
    'network_disclaimer'
]


def create_default_nuxes():
    try:
        for nux_name in DEFAULT_NUXES:
            nux, created = NewUserExperience.objects.get_or_create(
                name=nux_name
            )
            nux.save()
        return True
    except Exception:
        return False


class Command(BaseCommand):
    def handle(self, *args, **options):
        self.stdout.write('Creating default new user experiences')
        try:
            success = create_default_nuxes()
            if success:
                self.stdout.write('Successfully created new user experiences')
            else:
                self.stderr.write('Failed to create new user experiences')
        except Exception as e:
            self.stderr.write(str(e))
