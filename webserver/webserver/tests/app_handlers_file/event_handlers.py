from webserver.celery_event_handler import CeleryEvents
from webserver.tests.test_celery_event_handler import (
    mock_event_handler,
    mock_test_function,
)


@mock_event_handler.add_event_handler(CeleryEvents.TASK_RECEIVED)
@mock_test_function
def mock_on_task_received(event):
    pass


@mock_event_handler.add_event_handler(CeleryEvents.TASK_RECEIVED)
@mock_test_function
def another_mock_received(event):
    pass


@mock_test_function
def not_an_event_handler(event):
    pass
