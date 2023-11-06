# (c) Meta Platforms, Inc. and affiliates. Copyright
import waffle


ACCOUNT_CREATION_SWITCH = "ENABLE_ACCOUNT_CREATION"


def enable_account_creation():
    return waffle.switch_is_active(ACCOUNT_CREATION_SWITCH)
