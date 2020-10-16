from selenium.webdriver import Chrome
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from multiprocessing.dummy import Pool as ThreadPool
import json

from util.constants import URL_MAP, TYPE_MAP, ASR_SEARCH_URL, FCC_DATA_URL
from util.fcc import retrieveDataMaps
from util import s3
import config


def chunk(lst, n):
    return [lst[i:i + n] for i in range(0, len(lst), n)]


def crawl(keys):
    if not keys:
        return
    global counter_key
    global total_keys
    counter_key += 1
    x = total_keys // 20 + 1
    if (counter_key % x == 0):
        print(f'        current process: {counter_key}/{total_keys}')
    driver_path = config.DRIVER_PATH
    options = ChromeOptions()
    options.add_argument('--headless')
    options.add_argument("--no-sandbox")
    options.add_argument("disable-gpu")
    key = keys[0]
    with Chrome(executable_path=driver_path, options=options) as driver:
        try:
            driver.get(ASR_SEARCH_URL)
            driver.find_element(By.NAME, 'fiSearchByValue').send_keys(key + Keys.ENTER)
            elements = driver.find_elements_by_class_name('cell-pri-medium')
            fcc_url = driver.find_element_by_link_text(key).get_attribute('href')
            if len(elements) > 5:
                owner_name = elements[5].text.strip()
                shared_memory_map[key] = {
                        **co_map[key],
                        'fcc_url': fcc_url,
                        'owner_name': owner_name
                        }
            else:
                shared_memory_map[key] = {
                        **co_map[key],
                        'fcc_url': '',
                        'owner_name': ''
                        }
            return crawl(keys[1:])
        except Exception:
            shared_memory_map[key] = {
                    **co_map[key],
                    'fcc_url': '',
                    'owner_name': ''
                    }
            return crawl(keys[1:])


def crawlAll(keys):
    global counter_key
    global total_keys
    total_keys = len(keys)
    counter_key = 0
    print(f'        total number to crawl: {total_keys}')
    thread_num = 5
    chunk_size = len(keys) // thread_num + 1
    lst = chunk(keys, chunk_size)
    pool = ThreadPool(thread_num)
    pool.map(crawl, lst)


def addTowerOwner(co_map):
    print('STEP 4. Retrieve New Tower Owner Info')
    print('    a. retrieving newest geojson from s3 bucket(isptoolbox-towerlocator)')
    towerTile = s3.readFromS3()
    print('    ----a is finshed')
    features = towerTile['features']
    geo_map = dict()
    for feat in features:
        prop = feat['properties']
        geo_map[prop['registration_number']] = prop
    existed_key_set = set(geo_map)
    co_key_set = set(co_map.keys())
    crawl_keys = co_key_set.difference(existed_key_set)

    print('    b. starting crawling Tower Owner Name & FCC URL')
    crawlAll(list(crawl_keys))
    print('    ----b is finshed')
    features = towerTile['features']
    map = {
            **geo_map,
            **shared_memory_map
            }
    print('    DONE: Retrieve New Tower Owner Info\n')
    return map


def outputTowerGeo(properties):
    print('STEP 5. Export Tower Locator GeoJson')
    features = []
    for prop in properties:
        longitude = prop['longitude']
        latitude = prop['latitude']
        owner_name = prop['owner_name']
        structure_type = prop['structure_type']
        x = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [longitude, latitude]
                    },
                'properties': {
                    **prop,
                    'structure_type': TYPE_MAP[structure_type] if structure_type in TYPE_MAP else structure_type,
                    'url': URL_MAP[owner_name] if owner_name in URL_MAP else ''
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
    global shared_memory_map
    global total_keys
    global counter_key
    shared_memory_map = dict()
    total_keys = 0
    counter_key = 0
    print(f'retrieve data from FCC ({FCC_DATA_URL})')
    data_map = retrieveDataMaps()
    co_map = data_map['co_map']
    ra_map = data_map['ra_map']

    co_with_owner_map = addTowerOwner(co_map)
    properties = []
    for key in co_with_owner_map.keys():
        properties.append({
                **co_with_owner_map.get(key, {}),
                **ra_map.get(key, {}),
                'registration_number': key
                })
    outputTowerGeo(properties)
    print('Finish all')
