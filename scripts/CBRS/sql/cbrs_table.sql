BEGIN;
CREATE TABLE "public"."cbrs_data" (
	"state" varchar(2),
	"countycode" varchar(3),
	"county" varchar(100),
	"price" varchar(15),
	"companies" varchar(511),
	"licensecounts" varchar(31)
);
COMMIT;
