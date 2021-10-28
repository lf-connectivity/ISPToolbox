import json

from util.constants import get_tower_url, TYPE_MAP, FCC_DATA_URL, STATUS_CODES
from util.fcc import retrieveDataMaps
from util import s3


def outputTowerGeo(properties):
    print('STEP 4. Export Tower Locator GeoJson')
    features = []
    for prop in properties:
        if set(['latitude', 'longitude', 'system_identifier']).issubset(prop.keys()):
            # Believe it or not, junk data exists
            longitude = prop['longitude']
            latitude = prop['latitude']
            system_identifier = prop['system_identifier']
            status_code = prop.get('status_code', 'UNKN')
            structure_type = prop.get('structure_type', 'UNKN')
            x = {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [longitude, latitude]
                        },
                    'properties': {
                        **prop,
                        'structure_type': TYPE_MAP[structure_type] if structure_type in TYPE_MAP else structure_type,
                        'fcc_url': get_tower_url(system_identifier),
                        'status': STATUS_CODES[status_code]
                    }
                }

            features.append(x)
    result = {
            'type': 'FeatureCollection',
            'features': features
            }
    print('    a. upserting geojson to s3 bucket(isptoolbox-towerlocator)')
    s3.writeToS3(result)
    print('    ----a is finshed')
    print('    b. generating local geojson to manually update to mapbox')
    with open('towerLocator.json', 'w') as fwrite:
        fwrite.write(json.dumps(result))
    print('    ----b is finshed')
    print('    DONE: Export Tower Locator GeoJson\n')


if __name__ == '__main__':
    print('Start to generate Tower Locator GeoJson')
    total_keys = 0
    counter_key = 0
    print(f'retrieve data from FCC ({FCC_DATA_URL})')
    data_map = retrieveDataMaps()
    co_map = data_map['co_map']
    ra_map = data_map['ra_map']
    en_map = data_map['en_map']

    properties = []
    for key in co_map.keys():
        properties.append({
                **co_map.get(key, {}),
                **ra_map.get(key, {}),
                **en_map.get(key, {}),
                'registration_number': key
                })
    outputTowerGeo(properties)
    print('Finish all')
