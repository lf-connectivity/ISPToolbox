from celery.utils.log import get_task_logger
import subprocess


TASK_LOGGER = get_task_logger(__name__)


def celery_task_subprocess_check_output_wrapper(command, *args, **kwargs):
    """Runs `check_output`, and if fails, logs the output and error and reraises"""
    try:
        subprocess.check_output(command, *args, **kwargs)
    except subprocess.CalledProcessError as e:
        TASK_LOGGER.error(f'{str(e)}')
        TASK_LOGGER.error('Output:')
        output = e.output.decode('utf-8')
        for line in output.split('\n'):
            TASK_LOGGER.error(line)
        raise e
