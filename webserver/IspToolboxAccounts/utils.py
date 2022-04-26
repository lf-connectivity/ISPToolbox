from xmlrpc.client import Boolean
import waffle


ACCOUNT_CREATION_SWITCH = "ENABLE_ACCOUNT_CREATION"


def enable_account_creation() -> Boolean:
    return waffle.switch_is_active(ACCOUNT_CREATION_SWITCH)
