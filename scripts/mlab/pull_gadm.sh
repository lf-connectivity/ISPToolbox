#!/bin/bash
# Pull GADM files - theses are boundary files for different countries - be careful with the license
wget https://biogeo.ucdavis.edu/data/gadm3.6/shp/gadm36_BRA_shp.zip
mkdir gadm36_BRA
unzip gadm36_BRA_shp.zip -d gadm36_BRA

# Push GADM files to Postgres
shp2pgsql -s 4326 -I gadm36_BRA_3 public.gadm36_BRA_3 | PGPASSWORD=$PGPASSWORD psql -h $PGHOST -d $PGDATABASE -U $PGUSER