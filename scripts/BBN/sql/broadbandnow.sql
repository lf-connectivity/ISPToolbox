-- (c) Meta Platforms, Inc. and affiliates. Copyright
-- Schema for BroadbandNow data
BEGIN;
CREATE TABLE IF NOT EXISTS "broadbandnow" (
    "block_id" varchar(15) PRIMARY KEY,
    "tract_id" varchar(11) NOT NULL,
    "zip_code" varchar(5) NOT NULL,
    "population" integer NOT NULL,
    "block_id_area" bigint NOT NULL,
    "terrestrial_25_3" integer NOT NULL,
    "minprice_broadband_plan_terrestrial" dec(5,2)
);
COMMIT;
