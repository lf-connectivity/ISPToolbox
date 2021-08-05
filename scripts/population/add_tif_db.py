import os
import glob
import subprocess
import shlex
import zipfile


# USE THIS SCRIPT TO CONVERT TO FLOAT32 - postgis doesn't support float64
# #!/bin/sh
cmd = """
mkdir ~/hrsl/translate/
ls ~/hrsl/*.tif | awk '{print $1}' | while read file; do
echo $file;
gdal_translate -ot Float32 -a_nodata 0 $file ~/hrsl/translate/`basename $file`;
done
"""
subprocess.run(shlex.split(cmd))

# CREATE SQL commands to add dataset

output_path = '~/hrsl/translate/'
output_path = os.path.expanduser(output_path)
files = glob.glob(f'{output_path}*.zip')
for file in files:
    with zipfile.ZipFile(file, 'r') as zip_ref:
        zip_ref.extractall(output_path)

files = glob.glob(f'{output_path}*.tif')
table = 'hrsl_usa_1_5'
# create_table_sql
if len(files) > 0:
    command = f'raster2pgsql -p -I {files[0]} {table} > {output_path}create.sql'
    subprocess.run(shlex.split(command))
for file in files:
    command = f'raster2pgsql -t auto -I -a {file} {table} > {file}.sql'
    subprocess.run(shlex.split(command))

# Run SQL commands on dataset
# #!/bin/sh
cmd = """
# get credentials from secrets manager
ls *.sql | awk '{print $1}' | while read file; do
psql -h -p -U -f $file;
done
"""
subprocess.run(shlex.split(cmd))
