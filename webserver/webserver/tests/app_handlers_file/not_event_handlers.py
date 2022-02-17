from webserver.celery_event_handler import CeleryEvents
from webserver.tests.test_celery_event_handler import (
    mock_event_handler,
    mock_test_function,
)


@mock_event_handler.add_event_handler(CeleryEvents.TASK_RECEIVED)
@mock_test_function
def dont_import_me(event):
    pass
