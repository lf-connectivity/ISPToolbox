import pdal
from django.contrib.gis.geos import Point
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from scipy.interpolate import interp1d
from numpy import arange

interpolation_step = 10. / 100.  # cm


def getLidarPointsAroundLink(ept_path, link, tempfile_path, ept_transform, resolution, link_buffer=3):
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
    arr = pipeline.arrays[0]
    x_idx = pipeline.arrays[0].dtype.names.index('X')
    y_idx = pipeline.arrays[0].dtype.names.index('Y')
    z_idx = pipeline.arrays[0].dtype.names.index('Z')

    pts = [[link_T.project_normalized(Point(pt[x_idx], pt[y_idx]))*link_length, pt[z_idx]] for pt in arr]
    pts.sort(key=lambda x: x[0])
    # interpolate output to reduce size
    interpfunc = interp1d(
        [pt[0] for pt in pts],
        [pt[1] for pt in pts],
        assume_sorted=True,
        bounds_error=False,
        fill_value=(pts[0][1], pts[-1][1])
    )
    dists = arange(0, link_length, interpolation_step)
    hgts = interpfunc(dists)
    pts = [[d, float(h)] for d, h in zip(dists, hgts)]
    return pts, count
