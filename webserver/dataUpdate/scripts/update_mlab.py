from dataUpdate.util.clients import dbClient, bqClient
from dataUpdate.util.mail import sendNotifyEmail
from datetime import datetime


def updateMlab():
    from dataUpdate.models import Source
    try:
        bqQuery = """
                   #standardSQL
                    with dl as (
                    SELECT
                        fhoffa.x.median(ARRAY_AGG(downloads.a.MeanThroughputMbps)) AS med_down,
                        downloads.client.Geo.postal_code as postal
                    FROM
                        measurement-lab.ndt.unified_downloads as downloads
                    WHERE
                        (downloads.client.Geo.country_name = "Canada" OR downloads.client.Geo.country_name = "United States")
                        AND downloads.test_date >= '2020-01-01'
                        AND downloads.client.Geo.country_code IS NOT NULL
                        AND downloads.client.Geo.country_code != ""
                        AND downloads.client.Geo.region IS NOT NULL
                        AND downloads.client.Geo.region != ""
                    GROUP BY postal
                    ),
                    ul as (
                    SELECT
                        fhoffa.x.median(ARRAY_AGG(uploads.a.MeanThroughputMbps)) AS med_up,
                        client.Geo.postal_code as postal
                    FROM
                        measurement-lab.ndt.unified_uploads as uploads
                    WHERE
                        (uploads.client.Geo.country_name = "Canada" OR uploads.client.Geo.country_name = "United States")
                        AND test_date >= '2020-01-01'
                        AND client.Geo.country_code IS NOT NULL
                        AND client.Geo.country_code != ""
                        AND client.Geo.region IS NOT NULL
                        AND client.Geo.region != ""
                    GROUP BY postal
                    )
                    SELECT med_up, med_down, dl.postal from dl, ul
                    WHERE dl.postal = ul.postal;
                """

        # Upsert query for updating rows in mlabs database table
        dbQuery = """
                    BEGIN;
                    INSERT INTO standardized_mlab (up, down, postalcode)
                    VALUES ({}, {}, '{}')
                    ON CONFLICT (postalcode) DO
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
            cursor.execute(dbQuery.format(row['med_up'], row['med_down'], row['postal'], row['med_up'], row['med_down']))
        # Update source last updated objects
        complete = datetime.now()
        s_ca = Source.objects.get_or_create(source_id='MLAB', source_country='CA')
        s_us = Source.objects.get_or_create(source_id='MLAB', source_country='US')
        s_ca[0].last_updated = complete
        s_us[0].last_updated = complete
        s_ca[0].save()
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
