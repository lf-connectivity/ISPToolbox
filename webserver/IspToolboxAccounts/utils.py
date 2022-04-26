from django.utils.functional import lazy
import waffle


ACCOUNT_CREATION_SWITCH = "ENABLE_ACCOUNT_CREATION"


def enable_account_creation():
    return waffle.switch_is_active(ACCOUNT_CREATION_SWITCH)


enable_account_creation = lazy(enable_account_creation, bool)
