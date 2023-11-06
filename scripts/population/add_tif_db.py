# (c) Meta Platforms, Inc. and affiliates. Copyright
import asyncio
import functools
import os
import glob
import shlex
import shutil
import datetime
import subprocess

# Let's not try to crash the thing.
CONCURRENCY_LIMIT = 15

UNTRANSLATED_PATH = os.path.expanduser('~/hrsl/')
TRANSLATED_PATH = os.path.expanduser('~/hrsl/translate/')
PROGRESS_PATH = os.path.expanduser('~/hrsl/progress/')

COUNTRY = None

UNZIP_STEP = 'unzip'
CONVERT_STEP = 'convert_float32'
CREATE_TABLE_STEP = 'create_table'
CREATE_SQL_STEP = 'create_sql'
EXEC_CREATE_TABLE_STEP = 'exec_create_table'
EXEC_SQL_STEP = 'exec_sql'
EXEC_SQL_CMD_STEP = 'exec_sql_cmd'

COUNTRY = 'bra'
if COUNTRY is None:
    raise NotImplementedError('Missing country name')

SQL_TABLE = f'hrsl_{COUNTRY}_1_5'


# RUN https://gist.github.com/johnjreiser/24c8267d8fa0a866fdf352f1911a1c40 before starting
# then set LD_LIBRARY_PATH to /lib. Also set settings for DB.

# Create progress file so if script stops in the middle everything that got completed
# doesn't happen again.
def finish_step(filepath, step):
    progress_filename = filepath.replace('/', '_')
    progress_filepath = f'{PROGRESS_PATH}{progress_filename}.{step}'
    open(progress_filepath, 'w')


def step_finished(filepath, step):
    progress_filename = filepath.replace('/', '_')
    progress_filepath = f'{PROGRESS_PATH}{progress_filename}.{step}'
    return os.path.exists(progress_filepath)


# https://stackoverflow.com/questions/48483348/how-to-limit-concurrency-with-python-asyncio/61478547#61478547
async def gather_with_concurrency(n, *tasks):
    semaphore = asyncio.Semaphore(n)

    async def sem_task(task):
        async with semaphore:
            return await task
    return await asyncio.gather(*(sem_task(task) for task in tasks))


# func takes a filename and outputs a command. The invocation of parallel step
# is passing in a list.
def parallel_command_step(step_name, concurrency_limit=CONCURRENCY_LIMIT):
    def decorator(func):
        @functools.wraps(func)
        async def do_step(filelist):
            start_time = datetime.datetime.now()
            unfinished_files = [
                file for file in filelist if not step_finished(file, step_name)]

            async def process_file(file):
                command = func(file)
                if isinstance(command, tuple):
                    args, stdout = shlex.split(
                        command[0]), open(command[1], 'w')
                else:
                    args, stdout = shlex.split(command), None

                proc = await asyncio.create_subprocess_exec(*args, env=os.environ, stdout=stdout)
                await proc.wait()

                if proc.returncode == 0:
                    finish_step(file, step_name)

            await gather_with_concurrency(concurrency_limit, *[process_file(file) for file in unfinished_files])

            diff = datetime.datetime.now() - start_time
            num_processing = len(unfinished_files)
            num_skipped = len(filelist) - num_processing
            print(
                f'Executed {step_name} for {num_processing} items ({num_skipped} skipped)\tTime: {diff}')

        return do_step
    return decorator


@parallel_command_step(UNZIP_STEP)
def unzip_file(file):
    return f'unzip -o {file} -d {UNTRANSLATED_PATH}'


@parallel_command_step(CONVERT_STEP, concurrency_limit=5)
def convert_to_float32(file):
    return f'gdal_translate -ot Float32 -a_nodata 0 -co compress=lzw {file} {TRANSLATED_PATH}/{os.path.basename(file)}'


@parallel_command_step(CREATE_TABLE_STEP)
def create_table_sql(file):
    return f'raster2pgsql -s 4326 -p -I {file} {SQL_TABLE}', f'{TRANSLATED_PATH}create.sql'


@parallel_command_step(CREATE_SQL_STEP, concurrency_limit=3)
def create_sql_file(file):
    return f'raster2pgsql -s 4326 -t auto -I -a {file} {SQL_TABLE}', f'{file}-exec.sql'


# Be sure to have your environment variables set properly, and your password set up
# in ~/.pgpasswd
@parallel_command_step(EXEC_CREATE_TABLE_STEP)
def execute_create_table(file):
    host = os.environ['PGHOST']
    port = os.environ['PGPORT']
    user = os.environ['PGUSER']
    db = os.environ['PGDATABASE']
    return f'psql -h {host} -U {user} -d {db} -p {port} -f {file}'


def insert_into_table(file):
    host = os.environ['PGHOST']
    port = os.environ['PGPORT']
    user = os.environ['PGUSER']
    db = os.environ['PGDATABASE']
    return f'psql -h {host} -U {user} -d {db} -p {port} -f {file}'


@parallel_command_step(EXEC_SQL_STEP, concurrency_limit=6)
def execute_sql(file):
    insert_into_table(file)


@parallel_command_step(EXEC_SQL_CMD_STEP, concurrency_limit=6)
def execute_sql_cmd(command):
    host = os.environ['PGHOST']
    port = os.environ['PGPORT']
    user = os.environ['PGUSER']
    db = os.environ['PGDATABASE']
    return f'psql -h {host} -U {user} -d {db} -p {port} -c \'{command}\''


# SCRIPT BEGINS HERE
async def main():
    if not os.path.exists(TRANSLATED_PATH):
        os.mkdir(TRANSLATED_PATH)

    if not os.path.exists(PROGRESS_PATH):
        os.mkdir(PROGRESS_PATH)

    # Extract zip files
    files = glob.glob(f'{UNTRANSLATED_PATH}*.zip')
    await unzip_file(files)

    # CONVERT TO FLOAT32 - postgis doesn't support float64
    files = glob.glob(f'{UNTRANSLATED_PATH}*.tif')
    await convert_to_float32(files)

    # CREATE SQL commands to add dataset
    files = glob.glob(f'{TRANSLATED_PATH}*.tif')

    # create_table_sql
    if len(files) > 0:
        await create_table_sql([files[0]])
    await create_sql_file(files)

    # Run SQL commands on dataset
    files = glob.glob(f'{TRANSLATED_PATH}create.sql')
    if len(files) > 0:
        await execute_create_table([files[0]])

    # Perform Insert Operations on Table
    files = glob.glob(f'{TRANSLATED_PATH}*-exec.sql')
    for file in files:
        process = subprocess.Popen(shlex.split(insert_into_table(file)))
        process.wait()

    await execute_sql_cmd(f'UPDATE {SQL_TABLE} SET rast = ST_SetSRID(rast, 4326);')

    print('Finished setting up DB.')
    shutil.rmtree(PROGRESS_PATH)

if __name__ == '__main__':
    asyncio.run(main())
