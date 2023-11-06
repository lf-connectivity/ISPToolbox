# (c) Meta Platforms, Inc. and affiliates. Copyright
from celery.utils.log import get_task_logger
import subprocess


TASK_LOGGER = get_task_logger(__name__)


def celery_task_subprocess_check_output_wrapper(command):
    """Runs `check_output`, and if fails, logs the output and error and reraises"""
    try:
        subprocess.check_output(command, encoding="UTF-8", stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        TASK_LOGGER.error(f'Task failed: {str(e)}')
        TASK_LOGGER.error('[BEGIN COMMAND OUTPUT]')
        output = e.output
        for line in output.strip().split('\n'):
            TASK_LOGGER.error(line)
        TASK_LOGGER.error('[END COMMAND OUTPUT]')
        raise e
