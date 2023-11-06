# (c) Meta Platforms, Inc. and affiliates. Copyright
#!/usr/bin/env python3

import logging
import math
from itertools import combinations
from typing import List, Optional, Tuple


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

LARGE_DISTANCE_VALUE = 9999


def merge_similar_lines(
    lines: List[List[Tuple[float, float]]],
    max_distance_to_merge: int,
    max_angle_to_merge: int,
) -> List[List[Tuple[float, float]]]:
    """
    Merges similar lines together by examining the distance and angle between
    given lines
    """

    # Sort lines based on closer orientation to x-axis or y-axis
    lines_x = []
    lines_y = []
    for line in lines:
        # Calculate orientation (theta) based on slope
        orientation_i = math.atan2(
            (line[0][1] - line[1][1]),
            (line[0][0] - line[1][0]))
        if (abs(math.degrees(orientation_i)) > 45) and abs(
            math.degrees(orientation_i)
        ) < (90 + 45):
            lines_y.append(line)
        else:
            lines_x.append(line)

    # Sort based on orientation
    lines_x = sorted(lines_x, key=lambda l: l[0][0])
    lines_y = sorted(lines_y, key=lambda l: l[0][1])

    grouped_lines_x = _group_lines(
        lines_x,
        max_distance_to_merge,
        max_angle_to_merge)
    grouped_lines_y = _group_lines(
        lines_y,
        max_distance_to_merge,
        max_angle_to_merge)

    merged_lines_x = [_merge_lines(group) for group in grouped_lines_x]
    merged_lines_y = [_merge_lines(group) for group in grouped_lines_y]

    return merged_lines_x + merged_lines_y


def get_line_intersection(
    line1: List[Tuple[float, float]], line2: List[Tuple[float, float]]
) -> Optional[Tuple[float, float]]:
    """
    Find the intersection point of two lines -- regardless of enpdpoints.

    https://stackoverflow.com/questions/20677795/how-do-i-compute-the-intersection-point-of-two-lines
    """
    xdiff = (line1[0][0] - line1[1][0], line2[0][0] - line2[1][0])
    ydiff = (line1[0][1] - line1[1][1], line2[0][1] - line2[1][1])

    def det(a, b):
        return a[0] * b[1] - a[1] * b[0]

    div = det(xdiff, ydiff)
    if div == 0:
        return None

    d = (det(*line1), det(*line2))
    x = det(d, xdiff) / div
    y = det(d, ydiff) / div
    return x, y


def find_line_intersections(
    lines: List[List[Tuple[float, float]]],
    bounding_box: Optional[Tuple[int, int, int, int]] = None,
) -> List[Tuple[float, float]]:
    """
    Find all line intersections of all lines provided, optionally within a bounding box
    of specified width and height.
    """
    intersection_points = []
    line_combinations = combinations(lines, 2)
    for line_pair in list(line_combinations):
        intersection = get_line_intersection(line_pair[0], line_pair[1])
        if intersection:
            intersection_points.append(intersection)

    logger.debug(
        "Found {}intersection points.".format(
            len(intersection_points)))

    if bounding_box is None:
        return intersection_points

    # Filter for points contained within (0,0, size[0], size[1]) bounding box
    logger.debug(
        "Filtering to following bounding box: {}".format(bounding_box))
    filtered_int_pts = []
    for pt in intersection_points:
        if (
            pt[0] < bounding_box[0]
            or pt[1] < bounding_box[1]
            or pt[0] >= bounding_box[2]
            or pt[1] >= bounding_box[3]
        ):
            continue
        filtered_int_pts.append((int(pt[0]), int(pt[1])))

    logger.debug("Filtered to {} points.".format(len(filtered_int_pts)))
    return filtered_int_pts


def _are_lines_similar(
    line_a: List[Tuple[float, float]],
    line_b: List[Tuple[float, float]],
    max_distance: int,
    max_angle: int,
) -> bool:
    """
    Returns a true or false given two lines and the maximum distance and angle
    allowable between them.
    """

    # If distance between lines is above max_distance, return False
    if get_distance(line_b, line_a) > max_distance:
        return False

    # Get orientation of lines
    orientation_a = math.atan2(
        (line_a[0][1] - line_a[1][1]), (line_a[0][0] - line_a[1][0])
    )
    orientation_b = math.atan2(
        (line_b[0][1] - line_b[1][1]), (line_b[0][0] - line_b[1][0])
    )

    # If angle between lines is above max_angle, return False
    if (int(abs(abs(math.degrees(orientation_a)) -
                abs(math.degrees(orientation_b)))) > max_angle):
        return False

    # Distance and angle between lines is below threshold, so lines are similar
    return True


def _group_lines(
    lines: List[List[Tuple[float, float]]],
    max_distance_to_group: int,
    max_angle_to_group: int,
) -> List[List[List[Tuple[float, float]]]]:
    """
    Group similar lines to each other based on a max distance and angle.
    """
    grouped_lines = []

    for line_a in lines:
        create_new_group = True
        group_updated = False

        # Iterate through groups to find a matching group, if it exists
        for group in grouped_lines:
            for line_b in group:
                # Check if line_a is similar to line_b
                if _are_lines_similar(
                    line_a, line_b, max_distance_to_group, max_angle_to_group
                ):
                    # Add line to matching group
                    group.append(line_a)
                    create_new_group = False
                    group_updated = True
                    break

            if group_updated:
                break

        # If no matching group was found, create new group and
        # look for similar lines
        if create_new_group:
            new_group = []
            new_group.append(line_a)

            for line_b in lines:
                # Check if line_a is similar to line_b
                if _are_lines_similar(
                    line_a, line_b, max_distance_to_group, max_angle_to_group
                ):
                    new_group.append(line_b)

            grouped_lines.append(new_group)

    return grouped_lines


def _merge_lines(lines: List[List[Tuple[float, float]]]
                 ) -> List[Tuple[float, float]]:
    """
    Merges a group of lines into a single line using the first line in a group
    as the reference.
    """
    if len(lines) == 1:
        return lines[0]

    line_a = lines[0]

    # orientation
    orientation_a = math.atan2(
        (line_a[0][1] - line_a[1][1]), (line_a[0][0] - line_a[1][0])
    )

    points = []
    for line in lines:
        points.append(line[0])
        points.append(line[1])

    if (abs(math.degrees(orientation_a)) > 45) and abs(
            math.degrees(orientation_a)) < (90 + 45):
        # sort by y
        points = sorted(points, key=lambda point: point[1])
    else:
        # sort by x
        points = sorted(points, key=lambda point: point[0])

    return [points[0], points[len(points) - 1]]


def _get_line_magnitude(x1: float, y1: float, x2: float, y2: float) -> float:
    """
    Calculate magnitude of line using sqrt of squared differences
    """
    return math.sqrt(math.pow((x2 - x1), 2) + math.pow((y2 - y1), 2))


def _calculate_distance_from_point_to_line(
    px: float, py: float, x1: float, y1: float, x2: float, y2: float
) -> float:
    """
    Calculates the minimum distance from a point and line segment (i.e. consecutive vertices
    in a polyline)

    # https://nodedangles.wordpress.com/2010/05/16/measuring-distance-from-a-point-to-a-line-segment/
    # http://paulbourke.net/geometry/pointlineplane/
    """
    # http://local.wasp.uwa.edu.au/~pbourke/geometry/pointline/source.vba
    line_magnitude = _get_line_magnitude(x1, y1, x2, y2)

    distance = LARGE_DISTANCE_VALUE
    if line_magnitude < 0.00000001:
        return distance

    u1 = ((px - x1) * (x2 - x1)) + ((py - y1) * (y2 - y1))
    u = u1 / (line_magnitude * line_magnitude)

    if (u < 0.00001) or (u > 1):
        # // closest point does not fall within the line segment, take the shorter distance
        # // to an endpoint
        ix = _get_line_magnitude(px, py, x1, y1)
        iy = _get_line_magnitude(px, py, x2, y2)
        if ix > iy:
            distance = iy
        else:
            distance = ix
    else:
        # Intersecting point is on the line, use the formula
        ix = x1 + u * (x2 - x1)
        iy = y1 + u * (y2 - y1)
        distance = _get_line_magnitude(px, py, ix, iy)

    return distance


def get_distance(
    line1: List[Tuple[float, float]], line2: List[Tuple[float, float]]
) -> float:
    """
    Calculates the distance between endpoints and the other line -- returns the minimum of results
    """
    dist1 = _calculate_distance_from_point_to_line(
        line1[0][0],
        line1[0][1],
        line2[0][0],
        line2[0][1],
        line2[1][0],
        line2[1][1])
    dist2 = _calculate_distance_from_point_to_line(
        line1[1][0],
        line1[1][1],
        line2[0][0],
        line2[0][1],
        line2[1][0],
        line2[1][1])
    dist3 = _calculate_distance_from_point_to_line(
        line2[0][0],
        line2[0][1],
        line1[0][0],
        line1[0][1],
        line1[1][0],
        line1[1][1])
    dist4 = _calculate_distance_from_point_to_line(
        line2[1][0],
        line2[1][1],
        line1[0][0],
        line1[0][1],
        line1[1][0],
        line1[1][1])

    return min(dist1, dist2, dist3, dist4)
