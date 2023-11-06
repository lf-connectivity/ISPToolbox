# (c) Meta Platforms, Inc. and affiliates. Copyright
"""
Downloads census shapefiles (only available state by state) to the monthly update DB for use as market evaluator overlay.

CAUTION:
This script drops the current table of census blocks and rebuilds it.
You probably don't need to run this unless it's 2030 and you want to update census blocks.
Instead, just use the census blocks already in the table public.tl_2020_us_census_blocks
"""
import requests
import subprocess
import shlex
import glob
import os
from dataUpdate.util.clients import dbClient

CENSUS_FILE_PREFIX = "https://www2.census.gov/geo/tiger/TIGER2020/TABBLOCK20/tl_2020_"
CENSUS_FILE_SUFFIX = "_tabblock20.zip"
CENSUS_FILE_COUNT = 56


def addLeading0(num):
    return str(num).zfill(2)


def getAndWriteCensusFile(fileNum):
    if not os.path.exists("./census_blocks"):
        os.mkdir("census_blocks")
    # Save census block file
    with open("census_blocks/census_block_" + fileNum + ".zip", 'wb') as f:
        censusURL = CENSUS_FILE_PREFIX + fileNum + CENSUS_FILE_SUFFIX
        print("Grabbing census block file from: ", censusURL)
        try:
            r = requests.get(censusURL)
        except Exception as e:
            print("Error grabbing file from url: ", censusURL)
            print(e)
            raise e
        try:
            print(r.status_code)
            print(r.headers['content-type'])
            print(r.headers['content-length'])
            for chunk in r.iter_content(chunk_size=128):
                f.write(chunk)
        except Exception as e:
            print("Error while writing file " + fileNum + " on filesystem")
            print(e)
            raise e


def unzipCensusFile(fileNum):
    # Unzip census block file in current
    try:
        subprocess.run(shlex.split("unzip census_blocks/census_block_" + fileNum + ".zip"))
    except Exception as e:
        print("Failure unzipping state census block file num: " + fileNum)
        print(e)
        raise e


# flake8: noqa
def createInsertSQL(fileNum, create):
    try:
        if create:
            with open(f'insert_census_{fileNum}.sql', 'w') as f:
            # Destroy and create new table
                subprocess.call(['shp2pgsql', '-s', '4269:4326', '-d', f'tl_2020_{fileNum}_tabblock20',
                     'public.tl_2020_us_census_blocks'], stdout=f)
        else:
            with open(f'insert_census_{fileNum}.sql', 'w') as f:
            # Append to existing table
                subprocess.call(['shp2pgsql', '-s', '4269:4326', '-a', f'tl_2020_{fileNum}_tabblock20',
                     'public.tl_2020_us_census_blocks'], stdout=f)
    except Exception as e:
        print("Failure during shp2pgsql for fileNum: " + fileNum)
        print(e)
        raise e


def writeToDB(fileNum):
    with open("insert_census_" + fileNum + ".sql", 'r') as f:
        sql = f.read()
    try:
        dbConn = dbClient(prod=True)
        cursor = dbConn.cursor()
        # Split sql into two queries.  Some states are so massive in terms of census block #s 
        # they just barely exceed the postgresql query buffer limit of 1gb.
        spl = sql.split(";")
        q1 = ";".join(spl[:len(spl)//2])
        q2 = ";".join(spl[len(spl)//2:])
        cursor.execute(q1)
        cursor.execute(q2)
    except Exception as e:
        print("Failure during write to DB for fileNum: " + fileNum)
        print(e)
        raise e


def getAndSaveCensusFile(fileNum, create):
    try:
        getAndWriteCensusFile(fileNum)
        unzipCensusFile(fileNum)
        createInsertSQL(fileNum, create)
        writeToDB(fileNum)
    except Exception:
        return


def cleanup():
    [os.remove(f) for f in glob.glob("tl_2020_[0-9][0-9]_tabblock20.*")]
    [os.remove(f) for f in glob.glob("insert_census_[0-9][0-9].sql")]


if __name__ == "__main__":
    cleanup()
    # Create the table for the first file
    getAndSaveCensusFile(addLeading0(1), True)
    for i in range(2, CENSUS_FILE_COUNT + 1):
        # Rest of the tables should be insert only
        getAndSaveCensusFile(addLeading0(i), False)
        cleanup()
