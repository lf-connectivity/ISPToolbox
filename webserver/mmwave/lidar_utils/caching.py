from django.core.cache import caches

_CACHE_NAME = 'los'
_POINT_PRECISION = 7
_AOI_PRECISION = 3

# Store for a week
_DURATION = 7 * 24 * 60 * 60


cache = caches[_CACHE_NAME]


def _to_fixed(num, precision):
    return format(num, f'.{precision}f')


def _get_key(type, tx, rx, aoi,):
    tx_x = _to_fixed(tx.x, _POINT_PRECISION)
    tx_y = _to_fixed(tx.y, _POINT_PRECISION)
    rx_x = _to_fixed(rx.x, _POINT_PRECISION)
    rx_y = _to_fixed(rx.y, _POINT_PRECISION)
    aoi_0 = _to_fixed(aoi[0], _AOI_PRECISION)
    aoi_1 = _to_fixed(aoi[1], _AOI_PRECISION)

    return ':'.join([type, tx_x, tx_y, rx_x, rx_y, aoi_0, aoi_1])


def lidar_cache_set(tx, rx, aoi, resp):
    cache.set(_get_key('lidar', tx, rx, aoi), resp, timeout=_DURATION)


def lidar_cache_get(tx, rx, aoi):
    return cache.get(_get_key('lidar', tx, rx, aoi))
