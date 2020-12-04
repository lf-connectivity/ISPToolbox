DROP TABLE IF EXISTS computed_community_connect;

CREATE TABLE "public"."computed_community_connect" (
	"zipcode" varchar(5),
	"download" numeric,
	"upload" numeric,
	"geog" geography(MULTIPOLYGON, 4326));

WITH good_geog AS (
	SELECT DISTINCT tl_2019_us_zcta510.zcta5ce10 as zipcode, tl_2019_us_zcta510.geog as geog, "Download (Mbit/s)" as down, "Upload (Mbit/s)" as up FROM tl_2019_us_zcta510, mlab_uszip_10_5_2020
	WHERE "mlab_uszip_10_5_2020"."Zipcode"::varchar(5) = "tl_2019_us_zcta510"."zcta5ce10" AND "mlab_uszip_10_5_2020"."Download (Mbit/s)" <= 10 AND "mlab_uszip_10_5_2020"."Upload (Mbit/s)" <= 1
)
INSERT INTO computed_community_connect (zipcode, geog, download, upload)
SELECT DISTINCT good_geog.zipcode as zipcode, good_geog.geog as geog, down, up FROM good_geog, tl_2019_us_urban
WHERE NOT St_Intersects("good_geog"."geog", "tl_2019_us_urban"."geog");

