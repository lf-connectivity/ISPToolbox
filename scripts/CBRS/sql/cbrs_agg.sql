BEGIN;
CREATE TABLE "public"."cbrs_agg" (
	"geog" geography(MULTIPOLYGON, 4326),
	"price" varchar(15),
	"companies" varchar(511),
	"licensecounts" varchar(31),
	"county" varchar(100)
);
COMMIT;
