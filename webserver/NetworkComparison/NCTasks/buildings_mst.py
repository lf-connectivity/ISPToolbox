# (c) Meta Platforms, Inc. and affiliates. Copyright
import json
import math
import heapq
from collections import defaultdict
from django.db import connections


def getBuildingsMST(include):
    '''
        Computes the minimum spanning tree of centroids of buildings in applicable include geometry.
        Uses delaunay triangles to build the initial graph.
        Params:
        include<GeoJSON>: GeoJSON to include
        channelName<String>: Name of channel (websocket identifier) to send response to
        uuid<String>: Unique identifier to be sent back with the response
        Result sent:
        <GeoJSON>: MultiLineString
    '''
    query_skeleton = delaunay_centroid_graph
    with connections['gis_data'].cursor() as cursor:
        query_arguments = [include]
        cursor.execute(query_skeleton, query_arguments)
        results = cursor.fetchone()
        graph = json.loads(results[0])
        mst = multiLinePrims(graph)
        graph['coordinates'] = mst['mst']
        # Used the DB for transforming the projection back to degrees, seemed to run faster than python libs
        cursor.execute(transform_mercator_to_geodetic, [json.dumps(graph)])
        results = cursor.fetchone()
        graph = json.loads(results[0])
        graph['length'] = mst['length']
        return graph


def multiLinePrims(geoJson):
    '''
        Runs prim's algorithm on MultiLineString GeoJSON, O(|E|log(|V|)).
        Params:
        geoJson<dict>: MultiLineString GeoJSON
        Returns:
        {
            'mst': List of edges in the minimum spanning tree
            'length': Length of minimum spanning tree in units of inputted coordinates
        }
    '''
    adjList = defaultdict(list)
    start = None
    for line in geoJson['coordinates']:
        line = [tuple(p) for p in line]
        start = line[0]
        length = lineLength(line)
        adjList[line[0]].append((length, line[1], line[0]))
        adjList[line[1]].append((length, line[0], line[1]))
    # Array to hold edges in the MST
    mst = []
    # Length of MST built as we add edges
    totalLen = 0
    # Set of vertices already included in the MST
    verticesUsed = set()
    if start:
        # Heap to hold edges adjacent to the tree so far.
        edgeLengthHeap = adjList[start]
        verticesUsed.add(start)
        heapq.heapify(edgeLengthHeap)
        # While there are edges in the heap, we pop the min length edge
        # and add it to the tree if it connects a new vertex.
        # If so, we also add its edges to the heap for future consideration.
        while len(edgeLengthHeap):
            edge = heapq.heappop(edgeLengthHeap)
            if edge[1] not in verticesUsed:
                mst.append([list(edge[1]), list(edge[2])])
                totalLen += edge[0]
                for i in adjList[edge[1]]:
                    heapq.heappush(edgeLengthHeap, i)
                verticesUsed.add(edge[1])
    ret = {
        'mst': mst,
        'length': totalLen
    }
    return ret


def lineLength(points):
    xdiff = abs(points[0][0] - points[1][0])
    ydiff = abs(points[0][1] - points[1][1])
    return math.sqrt(xdiff**2 + ydiff**2)


delaunay_centroid_graph = """
    WITH selected AS(
        SELECT
        ST_Transform(ST_SetSRID(St_geomfromgeojson(%s), 4326), 3857) as selected_area_include
    ),
    buildingPoints AS (
        SELECT ST_Collect(ST_Centroid(geom)) AS centroids FROM msftbuildinggeom3857, selected
        WHERE ST_Intersects(geom, selected_area_include)
    ),
    graph AS (
        SELECT ST_DelaunayTriangles(centroids, 0.001, 1) AS graph from buildingPoints
    )
    SELECT ST_AsGeoJSON(graph) FROM graph, buildingPoints;
"""

transform_mercator_to_geodetic = """
    SELECT ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_geomfromgeojson(%s), 3857), 4326));
"""
