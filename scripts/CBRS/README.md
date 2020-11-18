## Scripts used for aggregating and processing CBRS data
- May be useful for aggregating other FCC auction data with a similar format
    - See aggregateCSV.py

## Steps used to create overlay:
Auction results shouldn't really change so I don't know why you would have to do it.  Here it is for reference though:

- Run `aggregateCSV.py` on CBRS license results CSV downloaded from: https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license
- This script aggregates license results by county.

- Copy generated csv data (county_aggregated_results.csv) to SQL db.  (Make sure cbrs_data is a fresh table see: `sql/cbrs_table.sql`)
```
```

- Create the `cbrs_agg` table to hold aggregated cbrs info with geography (see `sql/cbrs_agg.sql`).
- Run `cbrs.sql` to join country geography to the `cbrs_agg` table.
- Export shapefile and upload to mapbox:
```
```
