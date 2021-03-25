#!/bin/sh
PGPASSWORD=<db-password> psql -h isptoolbox-db-prod.cahmkzzberpf.us-west-1.rds.amazonaws.com -p 5432 -U fbcmasteruser -d postgres -f ./sql/improved_compute_cc.sql
mkdir cc-shpfile
pgsql2shp -f ./cc-shpfile/community-connect.shp -h isptoolbox-db-prod.cahmkzzberpf.us-west-1.rds.amazonaws.com -p 5432 -u fbcmasteruser -P <db-password> postgres "SELECT geog, zipcode as ZIPCODE, download as DOWNLOAD, upload as UPLOAD FROM computed_community_connect"
zip cc-shpfile.zip -r cc-shpfile/
