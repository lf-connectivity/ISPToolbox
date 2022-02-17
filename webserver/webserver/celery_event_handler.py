from django.conf import settings
from collections import defaultdict
from enum import Enum
from inspect import getmembers, isfunction, ismodule
import importlib
import logging
import threading

_CELERY_EVENT_HANDLER_FUNC_APP_ATTR = "_celery_event_handler_app"
_CELERY_EVENT_HANDLER_FUNC_TYPE_ATTR = "_celery_event_handler_type"


class CeleryEvents(Enum):
    TASK_SENT = "task-sent"
    TASK_RECEIVED = "task-received"
    TASK_STARTED = "task-started"
    TASK_SUCCEEDED = "task-succeeded"
    TASK_FAILED = "task-failed"
    TASK_REJECTED = "task-rejected"
    TASK_REVOKED = "task-revoked"
    TASK_RETRIED = "task-retried"
    WORKER_ONLINE = "worker-online"
    WORKER_HEARTBEAT = "worker-heartbeat"
    WORKER_OFFLINE = "worker-offline"


class CeleryTaskEventHandler:
    def __init__(self, app):
        self._app = app
        self.state = self._app.events.State()
        self._event_handlers = defaultdict(set)

    # Decorator for adding event handlers for a given event type.
    # We can't import event handlers directly into a celery worker,
    # so we do this indirectly via introspection later.
    def add_event_handler(self, celery_event_type):
        def decorator(func):
            setattr(func, _CELERY_EVENT_HANDLER_FUNC_APP_ATTR, self._app)
            setattr(func, _CELERY_EVENT_HANDLER_FUNC_TYPE_ATTR, celery_event_type)
            return func

        return decorator

    def get_task_from_task_event(self, event):
        return self.state.tasks.get(event["uuid"])

    def _on_event(self, event):
        if event["type"] != CeleryEvents.WORKER_HEARTBEAT.value:
            self.state.event(event)

        for func in self._event_handlers[event["type"]]:
            func(event)

    def _declared_as_event_handler(self, func):
        return (
            hasattr(func, _CELERY_EVENT_HANDLER_FUNC_TYPE_ATTR)
            and getattr(func, _CELERY_EVENT_HANDLER_FUNC_APP_ATTR, None) == self._app
        )

    def _run_thread(self):
        with self._app.connection() as connection:
            recv = self._app.events.Receiver(connection, handlers={"*": self._on_event})
            recv.capture(limit=None, timeout=None, wakeup=True)

    def start_monitoring(self):
        # Autodiscover event handlers in installed apps, under the
        # event_handlers module in each app.
        logging.info("Importing event handlers from installed apps")
        for module_name in settings.INSTALLED_APPS:
            try:
                event_handler_import = importlib.import_module(
                    ".event_handlers", module_name
                )
                if ismodule(event_handler_import):
                    for _, func in getmembers(event_handler_import, isfunction):
                        # Find if it was decorated from before
                        if self._declared_as_event_handler(func):
                            event_type = getattr(
                                func, _CELERY_EVENT_HANDLER_FUNC_TYPE_ATTR
                            ).value

                            self._event_handlers[event_type].add(func)

            except ModuleNotFoundError:
                pass

        logging.info("Event Handlers:")
        for event_type in self._event_handlers:
            logging.info(f"\t{event_type}:")
            for func in self._event_handlers[event_type]:
                logging.info(f"\t\t{func.__module__}.{func.__name__}")

        logging.info("Starting event handler monitor")
        self._thread = threading.Thread(target=self._run_thread, args=())
        self._thread.daemon = True
        self._thread.start()
