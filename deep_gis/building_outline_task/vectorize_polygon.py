#!/usr/bin/env python3

import logging
import timeit
from math import atan2, floor
from typing import List, Optional, Tuple, Union

import cv2
import numpy as np
from shapely.geometry import MultiPolygon, Polygon
from shapely.ops import unary_union
from sklearn.cluster import MeanShift
from building_outline_task.line_operations import (
    find_line_intersections,
    merge_similar_lines,
)


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

PREDICTION_THRESHOLD = 0.8
WHITE_PIXEL_THRESHOLD = PREDICTION_THRESHOLD * 255

SUBIMAGE_ORIGIN_COORD = 0
SUBIMAGE_PRINCIPAL_AXIS_BUFFER = 10
SUBIMAGE_POLYGONIZATION_BUFFER_PERCENTAGE = 0.2
CANNY_EDGE_LOWER_THRESHOLD = 0
CANNY_EDGE_UPPER_THRESHOLD = 255
MINIMUM_INTERSECTIONS_TO_BE_LINE = 12
HOUGH_MINIMUM_LINE_LENGTH = 6
HOUGH_MAX_LINE_GAP = 3
MAX_DISTANCE_TO_GROUP = 5
MAX_ANGLE_TO_GROUP = 15
MINIMUM_BUILDING_EDGE_PIXEL_LENGTH = 6
MAXIMUM_AGGREGATION_DISTANCE = 12
MINIMUM_SPLIT_RECTANGLE_DISTANCE = 30
FILLED_PIXEL_INSPECTION_THRESHOLD = 1.0
FILLED_PIXEL_SPLIT_THRESHOLD = 0.2
FILLED_PIXEL_SUCCESS_THRESHOLD = 0.6


def rotated_subimage(
    original_image: np.array,
    center: Tuple[float, float],
    theta: int,
    width: int,
    height: int,
    width_buffer: int,
    height_buffer: int,
) -> np.array:
    """
    Rotates Numpy array image around center with angle theta (in deg)
    then crops the image according to width, height, and given buffer percentage.
    """

    # Uncomment for theta in radians
    # theta *= 180/np.pi

    # Make copy of the original image
    image = original_image.copy()

    shape = (
        image.shape[1],
        image.shape[0],
    )  # cv2.warpAffine expects shape in (length, height)

    matrix = cv2.getRotationMatrix2D(center=center, angle=theta, scale=1)
    image = cv2.warpAffine(src=image, M=matrix, dsize=shape)

    x = int(center[0] - width / 2)
    y = int(center[1] - height / 2)

    return image[
        y - height_buffer : y + height + height_buffer,
        x - width_buffer : x + width + width_buffer,
    ]


def subimage(
    original_image: np.array,
    center: Tuple[float, float],
    width: int,
    height: int,
    buffer: int,
) -> np.array:
    """
    Crops the Numpy array image according to width, height, and given buffer.
    """
    # Make copy of the original image
    image = original_image.copy()

    x = int(center[0] - width / 2)
    y = int(center[1] - height / 2)

    return image[y - buffer : y + height + buffer, x - buffer : x + width + buffer]


def pad_image(img: np.array, pad_length: int, pad_val: int = 0) -> np.array:
    """
    Pads an image on all four sides with a constant pad_value and returns the
    padded image
    """
    return np.pad(img, pad_length, "constant", constant_values=pad_val)


def rotate_to_original_orientation(
    polygon: Polygon,
    theta: float,
    subimage_center: Tuple[int, int],
    original_center: Tuple[float, float],
) -> np.array:
    # Create list of coordinates
    coords = np.array(list(polygon.exterior.coords))
    inverse_rotation_matrix = cv2.getRotationMatrix2D(
        center=subimage_center, angle=-1 * theta, scale=1
    )

    # Create new matrix by horizontally stacking a ones vector and the polygon
    # coordinates. Dimensions need to match with the rotation matrix for dot product
    ones = np.ones(shape=(len(coords), 1))
    coords_ones_hstack = np.hstack([coords, ones])

    # Transform coordinates
    reverse_transform_coordinates = inverse_rotation_matrix.dot(coords_ones_hstack.T).T

    # Translate back to original coordinates using original center and subimage center
    translation_mat = np.array(
        [
            original_center[0] - subimage_center[0],
            original_center[1] - subimage_center[1],
        ],
        dtype=np.int32,
    )

    # Create numpy array from rotated coordinates
    rotated_coords = np.array(reverse_transform_coordinates, dtype=np.int32)

    # Add translation to get result coordinates
    return rotated_coords + translation_mat


def find_principal_axis(
    subimg: np.array, min_area_rect_width: int, min_area_rect_height: int
) -> Optional[float]:
    """
    Finds the principal axis of an image using OpenCV's Canny method and performs a
    Hough lines transformation, choosing the first, highest-ranking edge.
    """
    if subimg.size > 0:
        edges = cv2.Canny(subimg, CANNY_EDGE_LOWER_THRESHOLD, CANNY_EDGE_UPPER_THRESHOLD)
        lines = cv2.HoughLines(edges, 1, np.pi / 180, MINIMUM_INTERSECTIONS_TO_BE_LINE)
        theta = lines[0][0][1] / np.pi * 180 if lines is not None else None

        # If width > height, rotate so that principal axis is horizontal
        if theta is not None and min_area_rect_width > min_area_rect_height:
            theta = theta - 90
        return theta
    else:
        return None

def extend_lines_to_edge(
    lines: List[Tuple[float, float, float, float]],
    bounding_box: Tuple[int, int, int, int],
) -> List[List[Tuple[float, float]]]:
    """
    Extend lines to edges of the image -- the lines are actually extended
    slightly beyond the image borders but that is inconsequential.
    """
    width = bounding_box[2] - bounding_box[0]
    height = bounding_box[3] - bounding_box[1]
    extended_lines = []
    for line in lines:
        for x1, y1, x2, y2 in line:
            theta = atan2(y2 - y1, x2 - x1)
            mid_x = int((x1 + x2) / 2)
            mid_y = int((y1 + y2) / 2)
            x1_prime = int(mid_x + -width * 2 * np.cos(theta))
            y1_prime = int(mid_y + -height * 2 * np.sin(theta))
            x2_prime = int(mid_x + width * 2 * np.cos(theta))
            y2_prime = int(mid_y + height * 2 * np.sin(theta))
        extended_lines.append([(x1_prime, y1_prime), (x2_prime, y2_prime)])

    return extended_lines


def aggregate_nearby_coordinates(
    coordinates: List[float], nearby_distance: int, max_distance: int
) -> List[int]:
    """
    Aggregates coordinates within nearby_distance (up to a max_distance)
    from a given starting coordinate by calculating the coordinates'
    centroid

    Example: [5, 10, 15, 16, 25, 28, 30, 32, 38, 75, 79]
    nearby_distance = 6, max_distance = 15

    Result: [12, 31, 77]
    """

    def calculate_centroid(coordinate_list, start_idx, end_idx):
        centroid_sum = 0
        for i in range(start_idx, end_idx + 1):
            centroid_sum += coordinate_list[i]
        return centroid_sum / (end_idx - start_idx + 1)

    # Sort coordinates in ascending order
    coordinates = sorted(coordinates)

    if len(coordinates) < 2:
        return coordinates

    aggregated_coordinates = []

    group_start_idx = 0
    group_end_idx = 0
    aggregated_distance = 0
    # Iterate through coordinates starting at the second coordinate
    for idx in range(1, len(coordinates)):
        coordinate = coordinates[idx]
        distance = coordinate - coordinates[idx - 1]

        # Distance from previous coordinate to current coordinate
        # is greater than nearby distance
        if distance > nearby_distance:

            # Aggregate previous coordinates
            centroid = calculate_centroid(coordinates, group_start_idx, group_end_idx)
            aggregated_coordinates.append(centroid)

            # Reset aggregation variables
            aggregated_distance = 0
            group_start_idx = group_end_idx = idx

        # Distance from previous coordinate to current coordinate
        # is less than or equal to nearby distance
        else:
            # If adding previous-to-current distance to aggregated distance
            # is less than max distance, update group_end_idx to current index
            if aggregated_distance + distance < max_distance:
                aggregated_distance += distance
                group_end_idx = idx
            # If the result is greater than max distance, aggregate previous coordinates
            else:
                centroid = calculate_centroid(
                    coordinates, group_start_idx, group_end_idx
                )
                aggregated_coordinates.append(centroid)

                # Reset aggregation variables
                aggregated_distance = 0
                group_start_idx = group_end_idx = idx

    if aggregated_distance == 0:
        aggregated_coordinates.append(coordinates[-1])
    elif aggregated_distance > 0:
        centroid = calculate_centroid(coordinates, group_start_idx, group_end_idx)
        aggregated_coordinates.append(centroid)

    return [round(c) for c in aggregated_coordinates]


def identify_subrectangles(
    intersection_pts: List[Tuple[int, int]], bounding_box: Tuple[int, int, int, int]
) -> List[Tuple[int, int, int, int]]:
    """
    Uses intersection points to first:
        - Aggregate nearby values along the x-axis and y-axis
        - Basically draw a grid through the points themselves to divide
          the larger rectangle into smaller subrectangles
    """
    # Extract min, max values from bounding box
    min_x = bounding_box[0]
    min_y = bounding_box[1]
    max_x = bounding_box[2]
    max_y = bounding_box[3]

    # Collect all x and y coordinates from points, removing duplicates
    x_coords = aggregate_nearby_coordinates(
        sorted({pt[0] for pt in intersection_pts}),
        MINIMUM_BUILDING_EDGE_PIXEL_LENGTH,
        MAXIMUM_AGGREGATION_DISTANCE,
    )
    y_coords = aggregate_nearby_coordinates(
        sorted({pt[1] for pt in intersection_pts}),
        MINIMUM_BUILDING_EDGE_PIXEL_LENGTH,
        MAXIMUM_AGGREGATION_DISTANCE,
    )

    # If first, last coordinates not equal to min, max values, add them
    if x_coords[0] != min_x:
        x_coords.insert(0, min_x)

    if x_coords[-1] != max_x:
        x_coords.append(max_x)

    if y_coords[0] != min_y:
        y_coords.insert(0, min_y)

    if y_coords[-1] != max_y:
        y_coords.append(max_y)

    # Store idenfitied subrectangles
    return subrectangles_from_grid(x_coords, y_coords)


def identify_subrectangles_with_bounding_box(
    bounding_box: Tuple[int, int, int, int], width: int, height: int
) -> List[Tuple[int, int, int, int]]:
    # Get bounding edges of grid area - max values are offset by
    # width and height because we don't want the last value to be
    # potentially smaller than the width or the height
    min_x, min_y, max_x, max_y = bounding_box

    x_coords = list(range(min_x, max_x - width + 1, width)) + [max_x]
    y_coords = list(range(min_y, max_y - height + 1, height)) + [max_y]

    # Create subrectangles from coordinates
    return subrectangles_from_grid(x_coords, y_coords)


def subrectangles_from_grid(
    x_coords: List[int], y_coords: List[int]
) -> List[Tuple[int, int, int, int]]:
    """
    Uses a list of x and y coordinates to create a "grid" and identifies the subrectangles created by the grid
    """
    # Initialize variable to store generated subrectangles
    subrectangles = []

    y_wall = 0
    y_idx = 1
    while y_idx < len(y_coords):
        x_wall = 0
        x_idx = 1
        while x_idx < len(x_coords):
            subrectangles.append(
                (x_coords[x_wall], y_coords[y_wall], x_coords[x_idx], y_coords[y_idx])
            )
            x_wall = x_idx
            x_idx += 1
        y_wall = y_idx
        y_idx += 1

    return subrectangles


def split_subrectangle(
    subrectangle: Tuple[int, int, int, int], min_dimension: int
) -> List[Tuple[int, int, int, int]]:
    """
    Split subrectangle into 4 smaller quadrants until
    a specified minimum dimension for a quadrant is encountered.
    """
    center_x = floor((subrectangle[0] + subrectangle[2]) / 2)
    center_y = floor((subrectangle[1] + subrectangle[3]) / 2)

    split_subrectangles = []

    if (
        center_x - subrectangle[0] < min_dimension
        or center_y - subrectangle[1] < min_dimension
    ):
        return split_subrectangles

    # Add top-left rectangle
    split_subrectangles.append((subrectangle[0], subrectangle[1], center_x, center_y))

    # Add top-right rectangle
    split_subrectangles.append((center_x, subrectangle[1], subrectangle[2], center_y))

    # Add bottom-left rectangle
    split_subrectangles.append((subrectangle[0], center_y, center_x, subrectangle[3]))

    # Add bottom-right rectangle
    split_subrectangles.append((center_x, center_y, subrectangle[2], subrectangle[3]))

    return split_subrectangles


def find_filled_subrectangles(
    original_image: np.array,
    subrectangles: List[Tuple[int, int, int, int]],
    inspection_threshold: float,
    split_threshold: float,
    success_threshold: float,
    minimum_split_distance: float = MINIMUM_SPLIT_RECTANGLE_DISTANCE,
) -> List[Tuple[int, int, int, int]]:
    """
    Using a thresholded image, examine subrectangles to determine if filled or not
    filled, using three different threshold values:

        - Inspection Threshold: Percentage of a given subrectangle we
            have examined and determined that we've "seen enough" and are able to make
            a judgement call. For example of this is 0.8, then when we've looked at 80%
            of the subrectangle, we've seen enough of the pixels to make a quick call
            to avoid looking at the entire subrectangle.

        - Split Threshold: Percentage of a given subrectangle we have
            examined and determined that while the subrectangle is does not meet our
            requirement to be deemed "filled", it has a high enough filled percentage
            to be split into smaller subrectangles and re-examined.

        - Success Threshold: Percentage of a given subrectangle we
            have examined and determined that enough of the pixels are "filled" to be
            prematurely judged as a filled subrectangle.

        - Fail Threshold: Percentage of a given subrectangle we
            have examined and determined that enough of the pixels are NOT "filled"
            to be prematurely judged as a unfilled subrectangle.


    We do this by calculating a running "filled" and "inspected" percentage, where the
    filled percentage is the number of filled pixels over inspected pixels and the
    inspected percentage is the number of inspected pixels over total pixels.
    """
    subrectangles_to_inspect = subrectangles.copy()

    # For each subrectangle, inspect to see if contained area meets
    # filled pixel threshold
    filled_subrectangles = []

    while len(subrectangles_to_inspect) > 0:
        subrectangle = subrectangles_to_inspect.pop(0)
        min_x = subrectangle[0]
        min_y = subrectangle[1]
        max_x = subrectangle[2]
        max_y = subrectangle[3]

        subarea = (max_x - min_x) * (max_y - min_y)
        if subarea <= 0:
            continue

        # Begin inspection of subrectangle, tracking:
        # - Number of inspected pixels
        # - Number of filled pixels

        inspected_pixels_count = 0
        filled_pixel_count = 0
        end_inspection = False
        for y in range(min_y, max_y):
            # If inspection was ended at end of row
            # because either 1) the rectangle is adequately
            # filled or 2) rectangle will never be adequately
            # filled, end inspection early by breaking
            if end_inspection:
                break

            for x in range(min_x, max_x):
                # Check if pixel is non-zero (filled),
                # then increase the count
                if np.any(original_image[y][x]):
                    filled_pixel_count += 1

                # Increase inspected pixel count
                inspected_pixels_count += 1

            # If inspected percentage is above inspection_threshold, meaning
            # we've seen enough about the subarea to make a judgement call
            if inspected_pixels_count / subarea >= inspection_threshold:
                # Filled pixel percentage GE to success threshold
                # meaning this subrectangle can be counted as
                # "filled", and we can end inspection early
                if filled_pixel_count / subarea >= success_threshold:
                    filled_subrectangles.append(subrectangle)
                    end_inspection = True

                # Filled pixel percentage LE to threshold,
                # we know rectangle is not adequately filled
                # so end specific rectangle inspection early
                elif filled_pixel_count / subarea < (1 - success_threshold):
                    end_inspection = True

        # If filled percentage is above the split threshold,
        # split the subrectangle into quadrants and add to subreactangles
        if not end_inspection and filled_pixel_count / subarea >= split_threshold:
            split_subrects = split_subrectangle(subrectangle, minimum_split_distance)
            subrectangles_to_inspect.extend(split_subrects)

    return filled_subrectangles


def coordinates_from_bounding_box(
    bounding_box: Tuple[int, int, int, int]
) -> List[Tuple[int, int]]:
    """
    From the min/max x/y coordinates of a bounding box, return
    the four corner coordinates of the bounding box.
    """
    if bounding_box[0] >= bounding_box[2] or bounding_box[1] >= bounding_box[3]:
        return []

    return [
        (bounding_box[0], bounding_box[1]),  # Top-left corner
        (bounding_box[2], bounding_box[1]),  # Top-right corner
        (bounding_box[2], bounding_box[3]),  # Bottom-right corner
        (bounding_box[0], bounding_box[3]),  # Bottom-left corner
    ]


def combine_subrectangles_into_polygon(
    connected_subrectangles: List[List[Tuple[int, int]]]
) -> Union[Polygon, MultiPolygon]:
    """
    Create polygons from the subrectangles parameter and leverage Shapely's
    unary union operator to combine them into larger polygon(s).

    https://shapely.readthedocs.io/en/latest/manual.html#shapely.ops.unary_union
    """
    subrectangle_polygons = [Polygon(sr) for sr in connected_subrectangles]
    return unary_union(subrectangle_polygons)


def select_largest_polygon(unary_union_result: Union[Polygon, MultiPolygon]) -> Polygon:
    """
    Select the largest polygon from the result of combine_subrectangles_into_polygon
    """
    # If only a single Polygon was found
    if isinstance(unary_union_result, Polygon):
        return unary_union_result

    # Sort polygons by descending area, return largest
    return max(unary_union_result, key=lambda p: p.area)


def vectorize_building_prediction(img: np.array, contour: np.array) -> np.array:
    # Use bounding rectangle to get cropped image
    original_center, min_area_rect_size, _ = cv2.minAreaRect(contour)
    min_area_rect_width = floor(min_area_rect_size[0])
    min_area_rect_height = floor(min_area_rect_size[1])
    subimg_width_buffer = floor(min_area_rect_width * 0.2)
    subimg_height_buffer = floor(min_area_rect_width * 0.2)

    # Find principal axis using first Hough Transform and rotate subimage
    principal_axis_subimg = subimage(
        img.copy(),
        original_center,
        min_area_rect_width,
        min_area_rect_height,
        SUBIMAGE_PRINCIPAL_AXIS_BUFFER,
    )
    theta = find_principal_axis(
        principal_axis_subimg, min_area_rect_width, min_area_rect_height
    )
    # If we cannot identify a principal axis, return early
    if theta is None:
        return None

    # Pad the original image with empty values for
    # later operations to account for possible index errors
    # introduced by rotation
    pad_length = max(min_area_rect_width, min_area_rect_height) + max(
        subimg_width_buffer, subimg_height_buffer
    )
    padded_img = pad_image(img, pad_length)
    # Compute new center of contour based on pad length
    center = (
        floor(original_center[0]) + pad_length,
        floor(original_center[1] + pad_length),
    )

    # Rotate padded image to align principal axis with horizontal,
    # and crop the minimum area rect, with added buffer to capture more context
    # for second Hough Transform to detect significant edges
    padded_rotated_subimg = rotated_subimage(
        padded_img,
        center,
        theta,
        min_area_rect_width,
        min_area_rect_height,
        subimg_width_buffer,
        subimg_height_buffer,
    )
    subimg_bounding_box = (
        SUBIMAGE_ORIGIN_COORD,
        SUBIMAGE_ORIGIN_COORD,
        2 * subimg_width_buffer + min_area_rect_width,
        2 * subimg_height_buffer + min_area_rect_height,
    )
    subimg_center = (
        subimg_width_buffer + floor(min_area_rect_width / 2),
        subimg_height_buffer + floor(min_area_rect_height / 2),
    )

    # Perform second Hough Transform to identify, extend, and merge lines
    edges = cv2.Canny(
        padded_rotated_subimg.copy(),
        CANNY_EDGE_LOWER_THRESHOLD,
        CANNY_EDGE_UPPER_THRESHOLD,
    )
    lines = cv2.HoughLinesP(
        edges,
        1,
        np.pi / 180,
        MINIMUM_INTERSECTIONS_TO_BE_LINE,
        HOUGH_MINIMUM_LINE_LENGTH,
        HOUGH_MAX_LINE_GAP,
    )

    intersections = []
    # If lines have been detected
    if lines is not None:
        extended_lines = extend_lines_to_edge(lines, subimg_bounding_box)
        merged_lines = merge_similar_lines(
            extended_lines, MAX_DISTANCE_TO_GROUP, MAX_ANGLE_TO_GROUP
        )

        # Find intersection of lines
        intersections = find_line_intersections(merged_lines, subimg_bounding_box)

    # If lines or intersections were not detected, use minimum area rectangle vertices
    # as starting point for intersections
    if len(intersections) < 4:
        intersections = identify_subrectangles_with_bounding_box(
            subimg_bounding_box,
            MINIMUM_BUILDING_EDGE_PIXEL_LENGTH,
            MINIMUM_BUILDING_EDGE_PIXEL_LENGTH,
        )
        # Bounding box dimensions are smaller than minimum building edge length,
        # no polygon can be found
        if len(intersections) == 0:
            return None
    else:
        mean_shift_result = MeanShift(bandwidth=MAXIMUM_AGGREGATION_DISTANCE).fit(
            intersections
        )  # 1
        intersections = [
            (int(cc[0]), int(cc[1]))
            for cc in mean_shift_result.cluster_centers_.tolist()
        ]

    # Find all possible subrectangles made from intersection coordinates
    subrectangles = identify_subrectangles(intersections, subimg_bounding_box)

    # Determine which subrectangles are "filled"
    filled_subrectangles = find_filled_subrectangles(
        padded_rotated_subimg.copy(),
        subrectangles,
        inspection_threshold=FILLED_PIXEL_INSPECTION_THRESHOLD,
        split_threshold=FILLED_PIXEL_SPLIT_THRESHOLD,
        success_threshold=FILLED_PIXEL_SUCCESS_THRESHOLD,
    )
    # If no "filled" subrectangles were detected, return early
    if not filled_subrectangles:
        return None

    # Combine subrectangles into composite polygon, select largest
    subrectangle_coordinates = [
        coordinates_from_bounding_box(fs) for fs in filled_subrectangles
    ]
    subrectangle_union = combine_subrectangles_into_polygon(subrectangle_coordinates)
    polygon = select_largest_polygon(subrectangle_union)
    # If polygon was not detected, is not valid, or is empty, return early
    if not polygon or polygon.is_empty or not polygon.is_valid:
        return None

    # Rotate polygon to original orientation and position
    original_orientation_polygon = rotate_to_original_orientation(
        polygon, theta, subimg_center, original_center
    )

    return original_orientation_polygon
