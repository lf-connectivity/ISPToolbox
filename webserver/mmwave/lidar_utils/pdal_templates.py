import pdal
from django.contrib.gis.geos import Point
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from scipy.interpolate import interp1d
import numpy as np

DEFAULT_INTERPOLATION_STEP = 50. / 100.  # cm


def averageHeightAtDistance(distance, heights):
    """
    Remove duplicate distances along profile and replace with average heights
    """
    unique_increasing_distances, duplicate_indices, num_duplicates = np.unique(
        distance,
        return_inverse=True,
        return_counts=True
    )

    output = np.zeros(len(unique_increasing_distances))
    np.add.at(output, duplicate_indices, heights)
    output /= num_duplicates

    return unique_increasing_distances, output


def takeMaxHeightAtDistance(distance, heights):
    """
        Remove duplicate distances along profile and replace with max heights
    """
    unique_increasing_distances, duplicate_indices, _ = np.unique(
        distance,
        return_inverse=True,
        return_counts=True
    )
    output = np.zeros(len(unique_increasing_distances))
    np.maximum.at(output, duplicate_indices, heights)

    return unique_increasing_distances, output


def getLidarPointsAroundLink(
            ept_path, link, ept_transform, resolution,
            num_samples, interpolation_step=DEFAULT_INTERPOLATION_STEP, link_buffer=3
        ):
    link_length = geopy_distance(lonlat(link[0][0], link[0][1]), lonlat(link[1][0], link[1][1])).meters
    # TODO achong: - create link buffer based on LIDAR cloud reference frame units
    # link_buffer = 3 -> 3 meters for EPSG:3857
    link_T = link.transform(ept_transform, clone=True)
    bb_link_buffer = link_T.buffer(link_buffer)
    bounding_box = ([bb_link_buffer.extent[0], bb_link_buffer.extent[2]], [bb_link_buffer.extent[1], bb_link_buffer.extent[3]])
    query_json = f"""{{
        "pipeline": [
            {{
                "type": "readers.ept",
                "filename": "{ept_path}",
                "bounds": "{bounding_box}",
                "resolution" : {resolution},
                "polygon": ["{link_T.buffer(link_buffer).wkt}/ EPSG: 3857"]
            }},
            {{
                "type":"filters.outlier",
                "method":"statistical",
                "mean_k":12,
                "multiplier":2.2
            }},
            {{
                "type":"filters.crop",
                "polygon":"{link_T.buffer(link_buffer).wkt}"
            }}
        ]
    }}"""
    pipeline = pdal.Pipeline(query_json)
    count = pipeline.execute()
    if count < 2:
        raise Exception('No LiDAR Points Found')
    arr = pipeline.arrays[0]
    x_idx = pipeline.arrays[0].dtype.names.index('X')
    y_idx = pipeline.arrays[0].dtype.names.index('Y')
    z_idx = pipeline.arrays[0].dtype.names.index('Z')

    pts = [[link_T.project_normalized(Point(pt[x_idx], pt[y_idx]))*link_length, pt[z_idx]] for pt in arr]
    # Average Duplicate Points
    dsts, hgts = takeMaxHeightAtDistance([pt[0] for pt in pts], [pt[1] for pt in pts])

    # Resample Output Profile
    new_samples = np.linspace(0, link_length, num_samples)
    interpfunc = interp1d(
        dsts,
        hgts,
        assume_sorted=False,
        bounds_error=False,
        fill_value=(hgts[0], hgts[1])
    )
    link_data = interpfunc(new_samples)
    height_bounds = (min(link_data), max(link_data))
    return link_data.tolist(), count, link_T.extent + height_bounds, link_T
