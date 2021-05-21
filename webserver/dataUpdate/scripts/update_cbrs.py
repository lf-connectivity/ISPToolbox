import csv
import requests
import io
import json
from dataUpdate.util.clients import dbClient
from dataUpdate.util.mail import sendNotifyEmail
from datetime import datetime
from isptoolbox_storage.mapbox.upload_tileset import uploadNewTileset

AUCTION_URL = "https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license/download"

successSubject = "[Automated Message] Automated CBRS Data Refresh Successful"
successMessage = "Monthly CBRS data refresh was successful and the updated data should now be in our GIS database and overlay."

failSubject = "[Automated Message] Automated CBRS Data Refresh Failed"
failMessage = "Monthly CBRS data refresh failed due to an error: {}."


class CBRSCountyStats:
    def __init__(self, countyName, countyCode, stateCode, price, companyName):
        self.cn = countyName
        self.cc = countyCode
        self.sc = stateCode
        self.price = price
        self.companies = dict()
        self.companies[companyName] = 1

    def add(self, companyName, price):
        if price != self.price:
            raise Exception("Price not the same yikes")
        if companyName in self.companies:
            self.companies[companyName] += 1
        else:
            self.companies[companyName] = 1

    def companyCount(self):
        return len(self.companies)

    def sanityPrint(self):
        print("County name: {}, County code: {}, State code: {}, Price: {}".format(
            self.cn,
            self.cc,
            self.sc,
            self.price,
        ))
        print("Companies: ")
        for key in self.companies:
            print("Company: " + key)
            print("Licenses: " + str(self.companies[key]), flush=True)


# Escapes single quotes found in s by adding another
def escapeQuotes(s):
    return '\'\''.join(s.split('\''))


# Upserts the cbrs data table with given county data
def updateCBRSTable(counties):
    # Upsert query for updating rows in cbrs_data table
    resetQuery = """
                BEGIN;
                DROP TABLE IF EXISTS cbrs_data;
                CREATE TABLE "public"."cbrs_data" (
                    "state" varchar(2),
                    "countycode" varchar(3),
                    "county" varchar(100),
                    "price" varchar(15),
                    "companies" varchar(511),
                    "licensecounts" varchar(31)
                );
                COMMIT;
                """
    dbQuery = """
                INSERT INTO cbrs_data (state, countycode, county, price, companies, licensecounts)
                VALUES ('{}', '{}', '{}', '{}', '{}', '{}');
            """
    dbconn = dbClient(prod=True)
    cursor = dbconn.cursor()
    cursor.execute(resetQuery)
    for key in counties:
        agg = counties[key]
        countyCode = agg.cc
        stateCode = agg.sc
        countyName = escapeQuotes(agg.cn)
        price = agg.price
        companyDict = agg.companies
        companies = []
        licenseCounts = []
        for k in companyDict:
            companies.append(escapeQuotes(k))
            licenseCounts.append(str(companyDict[k]))
        companies = '|'.join(companies)
        licenseCounts = '|'.join(licenseCounts)
        cursor.execute(dbQuery.format(
            stateCode,
            countyCode,
            countyName,
            price,
            companies,
            licenseCounts
            )
        )


def updateCBRSOverlay():
    # Based on: https://gis.stackexchange.com/a/191446/183050
    geo_json_sql = """
                SELECT jsonb_build_object(
                    'type',     'FeatureCollection',
                    'features', jsonb_agg(features.feature)
                )
                FROM (
                    SELECT jsonb_build_object(
                        'type',       'Feature',
                        'geometry',   ST_AsGeoJSON(ST_Simplify(geom, 0.0001))::jsonb,
                        'properties', to_jsonb(inputs) - 'geom'
                    ) AS feature
                FROM (
                    SELECT "tl_2019_us_county"."geom" as geom,
                        price,
                        companies,
                        licensecounts,
                        county,
                        countycode,
                        "tl_2017_us_state"."stusps" as state,
                        "tl_2017_us_state"."statefp" as statecode
                        FROM cbrs_data, tl_2019_us_county, tl_2017_us_state
                    WHERE
                        countycode = countyfp AND
                        "cbrs_data"."state" = "tl_2017_us_state"."stusps" AND
                        "tl_2017_us_state"."statefp" = "tl_2019_us_county"."statefp"
                ) inputs) features;
                """
    dbconn = dbClient(prod=True)
    cursor = dbconn.cursor()
    cursor.execute(geo_json_sql)
    geojson = cursor.fetchone()
    b = bytes(json.dumps(geojson[0]), 'utf-8')
    bytesBuff = io.BytesIO(b)
    uploadNewTileset(bytesBuff, "cbrs_overlay")


def updateCbrs():
    from dataUpdate.models import Source
    try:
        with requests.get(AUCTION_URL, stream=True) as r:
            lines = (line.decode('utf-8') for line in r.iter_lines())
            reader = csv.reader(lines)
            # Skip header
            next(reader)
            counties = dict()
            # Aggregate data by county
            for row in reader:
                county = row[2]
                countySplit = county.split('-')
                stateCode = countySplit[0]
                countyCode = countySplit[1]
                countyName = row[3]
                companyName = row[4]
                price = row[-3]
                if county in counties:
                    counties[county].add(companyName, price)
                else:
                    counties[county] = CBRSCountyStats(countyName, countyCode, stateCode, price, companyName)
            maxCompanies = 0
            for key in counties:
                maxCompanies = max(maxCompanies, counties[key].companyCount())
            print("Updating table", flush=True)
            updateCBRSTable(counties)
            print("Updating overlay", flush=True)
            updateCBRSOverlay()
            complete = datetime.now()
            s_us = Source.objects.get_or_create(source_id='CBRS', source_country='US')
            s_us[0].last_updated = complete
            s_us[0].save()
            try:
                sendNotifyEmail(successSubject, successMessage)
            except Exception as e:
                # Notification is doomed :(
                # But we don't want to throw an exception and trigger the failure email so just return
                print("MLab update success notification email failed due to error: " + str(e))
                return
    except Exception as e:
        sendNotifyEmail(failSubject, failMessage.format(str(e)))
