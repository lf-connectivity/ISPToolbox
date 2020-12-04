# Non-Urban (Community Connect) Overlay Generation Script
- Script used to generate the < 10/1 Speeds Non-Urban overlay.
- Uses production DB (about 15% cpu) for most up to date m-labs data.  

## Running Script
- From this folder:
```
sh gen_non_urban.sh
```
- Runtime is around 1 hour
- Outputs /cc-shpfile and cc-shpfile.zip

## Upload to Mapbox
- On mapbox tiles, click "calculated-cc-speeds-shp-casfao" and click replace.
- Upload cc-shpfile.zip in order to replace the older one

