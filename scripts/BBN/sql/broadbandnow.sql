-- Schema for BroadbandNow data
BEGIN;
CREATE TABLE IF NOT EXISTS "broadbandnow" (
    "block_id" bigint PRIMARY KEY,
    "tract_id" bigint NOT NULL,
    "zip_code" varchar(5) NOT NULL,
    "population" integer NOT NULL,
    "block_id_area" integer NOT NULL,
    "terrestrial_25_3" integer NOT NULL,
    "minprice_broadband_plan_terrestrial" dec(5,2),
);
COMMIT;