import datetime
from dataUpdate.util.clients import dbClient
from dataUpdate.util.mail import sendNotifyEmail
from isptoolbox_storage.mapbox.upload_tileset import newTilesetMTS

# flake8: noqa
compute_sql = """
                DROP TABLE IF EXISTS computed_community_connect;

                CREATE TABLE "public"."computed_community_connect" (
                    "zipcode" varchar(5),
                    "download" numeric,
                    "upload" numeric,
                    "geog" geography(MULTIPOLYGON, 4326));
                WITH good_geog AS (
                    SELECT DISTINCT tl_2019_us_zcta510.zcta5ce10 as zipcode, tl_2019_us_zcta510.geog as geog, down, up FROM tl_2019_us_zcta510, standardized_mlab
                    WHERE postalcode = "tl_2019_us_zcta510"."zcta5ce10" AND down <= 10 AND up <= 1
                )
                INSERT INTO computed_community_connect (zipcode, geog, download, upload)
                SELECT DISTINCT good_geog.zipcode as zipcode, good_geog.geog as geog, down, up FROM good_geog, tl_2019_us_urban
                WHERE NOT St_Intersects("good_geog"."geog", "tl_2019_us_urban"."geog");
              """

# Based on: https://gis.stackexchange.com/a/191446/183050
# flake8: noqa
geo_json_sql = """
                SELECT jsonb_build_object(
                    'type',     'FeatureCollection',
                    'features', jsonb_agg(features.feature)
                )
                FROM (
                SELECT jsonb_build_object(
                    'type',       'Feature',
                    'geometry',   ST_AsGeoJSON(ST_Simplify(geog::geometry, 0.0001, TRUE))::jsonb,
                    'properties', to_jsonb(inputs) - 'geog'
                ) AS feature
                FROM (SELECT geog, zipcode as ZIPCODE, download as DOWNLOAD, upload as UPLOAD FROM computed_community_connect) inputs) features;
                """


def update_community_connect():
    from dataUpdate.models import Source
    try:
        successSubject = "[Automated Message] Automated Community Connect (non-urban) Data Refresh Successful"
        successMessage = "Monthly non-urban overlay data refresh was successful and the updated data should now be in our GIS database."

        failSubject = "[Automated Message] Automated Community Connect (non-urban) Data Refresh Failed"
        failMessage = "Monthly non-urban overlay data refresh failed due to an error: {}."

        dbConn = dbClient(prod=True)
        cursor = dbConn.cursor()
        # Calculate community connect (non-urban) table
        cursor.execute(compute_sql)
        # Grab geojson from computed table
        cursor.execute(geo_json_sql)
        geojson = cursor.fetchone()[0]
        newTilesetMTS(geojson, "non_urban_overlay_MTS", 3, 9)
        complete = datetime.now()
        s_us = Source.objects.get_or_create(source_id='NON_URBAN_OVERLAY', source_country='US')
        s_us[0].last_updated = complete
        s_us[0].save()
        try:
            sendNotifyEmail(successSubject, successMessage)
        except Exception as e:
            # Notification is doomed :(
            # But we don't want to throw an exception and trigger the failure email so just return
            print("non-urban overlay update success notification email failed due to error: " + str(e))
            return
    except Exception as e:
        sendNotifyEmail(failSubject, failMessage.format(str(e)))


if __name__ == "__main__":
    update_community_connect()
