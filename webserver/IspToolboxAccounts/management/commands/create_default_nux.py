from django.core.management.base import BaseCommand
from IspToolboxAccounts.models import NewUserExperience
from django.conf import settings


def create_default_nuxes():
    try:
        for nux_name in settings.NUXES:
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
