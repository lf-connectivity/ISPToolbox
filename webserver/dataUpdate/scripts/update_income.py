# (c) Meta Platforms, Inc. and affiliates. Copyright
# ISPToolbox Income Data Update Script
# RUN FROM /webserver: python -m dataUpdate.scripts.update_income
# Developed using the census data API: https://www.census.gov/data/developers/guidance/api-user-guide.Example_API_Queries.html
# Uses ACS 5 year estimate tables, for example: https://api.census.gov/data/2019/acs/acs5/subject/variables.html
# Search for ACS tables here: https://api.census.gov/data.html
# List of US statecodes: https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=53971

import requests
from dataUpdate.util.clients import dbClient

print("----------------------------------- ISPToolbox Income Data Update Script --------------------------------")
year = input("Enter the ACS community survey year to query: ")
print("I update state by state with a GET request for each so be patient.")
query = "https://api.census.gov/data/" + year + "/acs/acs5/subject?get=GEO_ID,S1901_C01_012E&for=tract:*&in=state:"
numstates = 56

# Upsert query for updating rows in income table
dbQuery = """
    BEGIN;
    INSERT INTO standardized_median_income (geoid, median_household_income)
    VALUES ('{}', {})
    ON CONFLICT (geoid) DO
    UPDATE SET median_household_income = {};
    COMMIT;
"""

dbconn = dbClient(prod=True)
cursor = dbconn.cursor()


def upsert(data):
    # Index from 1 to skip csv header entry
    for i in range(1, len(data)):
        d = data[i]
        # We skip 9 digits of the tract code in our db since the first 9 are always 1400000US
        tract = d[0][9:]
        income = d[1]
        # Ignore error values where data is unavailable/undefined (seems to be -666666666)
        if int(income) > 1:
            try:
                cursor.execute(dbQuery.format(tract, income, income))
            except Exception as e:
                print("Error upserting data into database, skipping")
                print("census tract:", tract)
                print("income:", income)
                print(e)


def updateState(statecode):
    q = query + statecode
    # Example response:
    # [ ['GEO_ID', 'S1901_C01_012E', 'state', 'county', 'tract'],
    #   ['1400000US01073001100', '37030', '01', '073', '001100'],
    #   ['1400000US01073001400', '36066', '01', '073', '001400'],
    #   ['1400000US01073002000', '27159', '01', '073', '002000']
    # ]
    # Note: We only care about the GEO_ID (census tract) and S1901_C01_012E (income)
    try:
        ret = requests.get(q).json()
    except Exception as e:
        print("Error requesting data for statecode:", statecode)
        # Statecodes have gaps which is a pain...
        print("This statecode was not updated, this may be due to a non-existent statecode like 03, 07, 14, 43, 52...")
        print("Or it could be due to a single digit statecode without a leading zero.")
        print(e)
        return
    upsert(ret)
    print("Completed update for statecode:", statecode)


for i in range(1, numstates+1):
    statecode = str(i)
    # Prepend 0 to single digit statecodes
    if len(statecode) == 1:
        statecode = '0' + statecode
    updateState(statecode)

# Puerto rico
updateState("72")
