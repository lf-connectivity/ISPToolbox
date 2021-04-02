import itertools


def merge_feature_collections(*geojsons):
    """Merge multiple feature collections into one."""

    # concatenate all features under features
    features = list(itertools.chain.from_iterable([geojson['features'] for geojson in geojsons]))

    return {
        'type': 'FeatureCollection',
        'features': features
    }
