INSERT INTO cbrs_agg(geog, price, companies, licensecounts, county)
SELECT "tl_2019_us_county"."geog", price, companies, licensecounts, county FROM cbrs_data, tl_2019_us_county, tl_2017_us_state
WHERE countycode = countyfp AND state = "tl_2017_us_state"."stusps" AND "tl_2017_us_state"."statefp" = "tl_2019_us_county"."statefp"
