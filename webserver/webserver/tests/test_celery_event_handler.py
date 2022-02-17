from collections import defaultdict
from django.test import TestCase
from inspect import getmodule
from unittest.mock import Mock
from functools import wraps

from webserver.celery_event_handler import CeleryEvents, CeleryTaskEventHandler

# DO NOT IMPORT OUTSIDE OF TESTS
mock_app = Mock()
mock_event_handler = CeleryTaskEventHandler(mock_app)

# Tally of how many of each type of event a function handled
_mock_event_handler_calls = defaultdict(lambda: defaultdict(int))


def _reset_mock_event_handler():
    global mock_event_handler, _mock_event_handler_calls
    mock_event_handler = CeleryTaskEventHandler(mock_app)
    mock_event_handler._run_thread = Mock()
    _mock_event_handler_calls = defaultdict(lambda: defaultdict(int))


_reset_mock_event_handler()


# Have to do this because mocks are not functions
def mock_test_function(func):
    @wraps(func)
    def wrapped_mock(event):
        global _mock_event_handler_calls
        func_key_name = f"{getmodule(func).__name__}.{func.__name__}"
        _mock_event_handler_calls[event["type"]][func_key_name] += 1
        func(event)

    return wrapped_mock


class CeleryTaskEventHandlerTest(TestCase):
    def setUp(self):
        _reset_mock_event_handler()

    def createEvent(self, event_type):
        global mock_event_handler
        mock_event_handler._on_event({"type": event_type.value})

    def assertEventHandlerCalledNTimes(self, event_type, func_name, times_called):
        global _mock_event_handler_calls
        self.assertEqual(
            _mock_event_handler_calls[event_type.value][func_name],
            times_called,
        )

    def assertEventHandlerNeverCalled(self, func_name):
        global _mock_event_handler_calls
        for event_type in CeleryEvents:
            self.assertEqual(_mock_event_handler_calls[event_type.value][func_name], 0)

    def test_event_handler_file(self):
        global mock_event_handler
        with self.settings(INSTALLED_APPS=["webserver.tests.app_handlers_file"]):
            mock_event_handler.start_monitoring()
            self.createEvent(CeleryEvents.TASK_RECEIVED)
            self.createEvent(CeleryEvents.TASK_SENT)
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_SENT,
                "webserver.tests.app_handlers_file.event_handlers.mock_on_task_received",
                0,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_SENT,
                "webserver.tests.app_handlers_file.event_handlers.another_mock_received",
                0,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_file.event_handlers.mock_on_task_received",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_file.event_handlers.another_mock_received",
                1,
            )
            self.assertEventHandlerNeverCalled(
                "webserver.tests.app_handlers_file.event_handlers.not_an_event_handler"
            )
            self.assertEventHandlerNeverCalled(
                "webserver.tests.test_app_event_handlers_file.not_event_handlers.dont_import_me"
            )

    def test_event_handler_dir(self):
        global mock_event_handler
        with self.settings(INSTALLED_APPS=["webserver.tests.app_handlers_dir"]):
            mock_event_handler.start_monitoring()
            self.createEvent(CeleryEvents.TASK_RECEIVED)
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_1.mock_on_task_received_file_1",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.mock_on_task_received_file_2",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_1.another_mock_received_file_1",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.another_mock_received_file_2",
                1,
            )
            self.assertEventHandlerNeverCalled(
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.mock_on_task_sent_file_2",
            )

            self.createEvent(CeleryEvents.TASK_SENT)
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_1.mock_on_task_received_file_1",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.mock_on_task_received_file_2",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_1.another_mock_received_file_1",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_RECEIVED,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.another_mock_received_file_2",
                1,
            )
            self.assertEventHandlerCalledNTimes(
                CeleryEvents.TASK_SENT,
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.mock_on_task_sent_file_2",
                1,
            )

            self.assertEventHandlerNeverCalled(
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_2.not_an_event_handler"
            )
            self.assertEventHandlerNeverCalled(
                "webserver.tests.app_handlers_dir.event_handlers.event_handlers_1.not_an_event_handler"
            )
