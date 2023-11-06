# (c) Meta Platforms, Inc. and affiliates. Copyright
from dataUpdate.util.clients import dbClient, bqClient
from bots.alert_fb_oncall import sendEmailToISPToolboxOncall
from datetime import datetime

COUNTRIES = ['US', 'BR', 'CA']


def updateMlab():
    from dataUpdate.models import Source
    from django.conf import settings
    if not settings.DEBUG:
        try:
            country_filter = ", ".join(
                [f'"{country}"' for country in COUNTRIES])
            bqQuery = f"""
                #standardSQL
                with dl as (
                SELECT
                    fhoffa.x.median(ARRAY_AGG(downloads.a.MeanThroughputMbps)) AS med_down,
                    downloads.client.Geo.PostalCode as postal,
                    downloads.client.Geo.CountryCode as ISO2,
                    downloads.client.Geo.Latitude as lat,
                    downloads.client.Geo.Longitude as lng,
                FROM
                    measurement-lab.ndt.unified_downloads as downloads
                WHERE
                    downloads.client.Geo.CountryCode in ({country_filter})
                    AND downloads.date >= '2020-01-01'
                    AND downloads.client.Geo.CountryCode IS NOT NULL
                    AND downloads.client.Geo.CountryCode != ""
                    AND downloads.client.Geo.region IS NOT NULL
                    AND downloads.client.Geo.region != ""
                GROUP BY postal, ISO2, lat, lng
                ),
                ul as (
                SELECT
                    fhoffa.x.median(ARRAY_AGG(uploads.a.MeanThroughputMbps)) AS med_up,
                    client.Geo.PostalCode as postal,
                    client.Geo.CountryCode as ISO2,
                    client.Geo.Latitude as lat,
                    client.Geo.Longitude as lng,
                FROM
                    measurement-lab.ndt.unified_uploads as uploads
                WHERE
                    client.Geo.CountryCode in ({country_filter})
                    AND uploads.date >= '2020-01-01'
                    AND client.Geo.CountryCode IS NOT NULL
                    AND client.Geo.CountryCode != ""
                    AND client.Geo.region IS NOT NULL
                    AND client.Geo.region != ""
                GROUP BY postal, ISO2, lat, lng
                )
                SELECT med_up, med_down, dl.postal, dl.ISO2, dl.lat, dl.lng from dl, ul
                WHERE dl.postal = ul.postal AND dl.ISO2 = ul.ISO2 AND dl.lat = ul.lat AND dl.lng = ul.lng;
            """

            # Upsert query for updating rows in mlabs database table
            dbQuery = """
                        BEGIN;
                        INSERT INTO standardized_mlab_global (up, down, postalcode, iso2, geom)
                        VALUES ({}, {}, '{}', '{}',  ST_GeomFromText('{}', 4326))
                        ON CONFLICT (postalcode, iso2) DO
                        UPDATE SET up = {}, down = {};
                        COMMIT;
                    """

            successSubject = "[Automated Message] Automated MLabs Data Refresh Successful"
            successMessage = "Monthly MLab data refresh was successful and the updated data should now be in our GIS database."

            failSubject = "[Automated Message] Automated MLabs Data Refresh Failed"
            failMessage = "Monthly MLab data refresh failed due to an error: {}."

            dbconn = dbClient(prod=True)
            cursor = dbconn.cursor()
            bqclient = bqClient()
            query_job = bqclient.query(bqQuery)
            for row in query_job:
                cursor.execute(dbQuery.format(
                    row['med_up'], row['med_down'],
                    row['postal'], row['ISO2'],
                    f"POINT({row['lng']} {row['lat']})",
                    row['med_up'], row['med_down'])
                )
            # Update source last updated objects
            complete = datetime.now()
            for country in COUNTRIES:
                s, _ = Source.objects.get_or_create(
                    source_id='MLAB', source_country=country)
                s.last_update = complete
                s.save()
            try:
                sendEmailToISPToolboxOncall(successSubject, successMessage)
            except Exception as e:
                # Notification is doomed :(
                # But we don't want to throw an exception and trigger the failure email so just return
                print(
                    "MLab update success notification email failed due to error: " + str(e))
                return
        except Exception as e:
            sendEmailToISPToolboxOncall(
                failSubject, failMessage.format(str(e)))
