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

