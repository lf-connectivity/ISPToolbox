# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.db import connections
from django.db.utils import Error as DjangoDbBaseError
import logging
import json
from shapely.geometry import shape
from IspToolboxApp.tasks.mmWaveTasks.mmwave import getOSMNodes


# Mapping for Canadian broadband tech to US tech codes used on FE (WispCompetitorModal.react.js)
CA_TECHCODES = {
    "No Local Access": -1,
    "Mobile Wireless": 0,
    "High Capacity Transport Services": 0,
    "DSL": 10,
    "Coaxial Cable": 40,
    "Fibre to the home": 50,
    "Satellite": 60,
    "Fixed Wireless": 70,
}


def select_gis_database(read_replica):
    if read_replica:
        return "gis_data_read_replica"
    else:
        return "gis_data"


def getUniqueBuildingNodes(nodes):
    buildings = {
        k: v
        for (k, v) in nodes.items()
        if (("tags" in v) and ("building" in v["tags"]) and ("nodes" in v))
    }
    return buildings


def getAllNodes(nodes_list):
    nodes = {}
    for d in nodes_list:
        nodes.update(d)
    return nodes


def filterIncludeExclude(building_shape, include, exclude):
    overlaps_include = False
    for polygon in include:
        if polygon.intersects(building_shape):
            overlaps_include = True
            break
    if overlaps_include and exclude is not None:
        for polygon in exclude:
            if polygon.intersects(building_shape):
                overlaps_include = False
                break
    return overlaps_include


def filterBuildingNodes(building_shapes, include, exclude):
    matching_buildings = [
        k
        for (k, v) in building_shapes.items()
        if filterIncludeExclude(shape(v), include, exclude)
    ]
    return matching_buildings, building_shapes


def computeBBSize(bb):
    size = abs((bb[0] - bb[2]) * (bb[1] - bb[3]))
    return size


def getQueryTemplate(skeleton, addExclude, includeExclude):
    if addExclude:
        if includeExclude:
            return skeleton.format(
                "St_intersects(geog, St_geomfromgeojson(%s)) AND St_intersects(geog, St_geomfromgeojson(%s))"
            )
        else:
            return skeleton.format(
                "St_intersects(geog, St_geomfromgeojson(%s)) AND NOT St_intersects(geog, St_geomfromgeojson(%s))"
            )
    else:
        return skeleton.format("St_intersects(geog, St_geomfromgeojson(%s))")


def checkIfPolyInCanada(include, exclude):
    """
    Returns True if polygons overlap with Canada and False otherwise.
    """
    return checkIfAvailable(include, exclude, {}, "ca_hex")


def checkIfIncomeProvidersAvailable(include, exclude):
    """
    Checks if income data is available.  This could also use the standardized_subdivisions table
    if more granular exclusion is required.
    """
    switcher = {
        "60": False,
        "66": False,
        "69": False,
        "78": False,
    }
    return checkIfAvailable(include, exclude, switcher, "standardized_prov_state")


def checkIfPrecomputedIncomeAvailable(include, exclude):
    """
    Checks if we have more granular income data available for a more accurate computation (US Only)
    """
    switcher = {
        "60": False,
        "66": False,
        "69": False,
        "78": False,
        "72": False,
    }
    return checkIfAvailable(include, exclude, switcher, "tl_2017_us_state")


def checkIfPrecomputedBuildingsAvailable(include, exclude):
    """
    Checks if we have Microsoft rooftop data available as opposed to openstreetmaps which is lacking in some rural areas.
    """
    switcher = {
        "60": False,
        "66": False,
        "69": False,
        "78": False,
        "72": False,
    }
    return checkIfAvailable(include, exclude, switcher, "standardized_prov_state")


def checkIfAvailable(include, exclude, switcher, table):
    resp = False

    with connections["gis_data"].cursor() as cursor:
        query_skeleton = "SELECT geoid FROM " + table + " WHERE {}"
        query_skeleton = getQueryTemplate(query_skeleton, exclude is not None, True)
        cursor.execute(
            query_skeleton, [include, exclude] if exclude is not None else [include]
        )
        for row in cursor.fetchall():
            if switcher.get(row[0], True):
                resp = True
                break
    return resp


def queryBuildingOutlines(include, exclude, callback=None):
    """
    include - GEOSGeometry
    exclude - GEOSGeometry | None
    returns a dict {'error' : string | None, 'buildings' : List}
    """
    include = include.geojson
    try:
        exclude = exclude.geojson
    except BaseException:
        logging.info("No Exclude Defined")
    # Check if Query is in US or Canada
    buildings_available = checkIfPrecomputedBuildingsAvailable(include, exclude)
    if buildings_available:
        response = getMicrosoftBuildings(include, exclude, callback=callback)
    else:
        response = getOSMBuildings(include, exclude, callback=callback)
    return response


def getOSMBuildings(include, exclude, callback=None):
    """
    include - string - a GeoJson String
    exclude - string | None - a GeoJSON string or type  None
    returns a dict {'error' : string | None, 'buildings' : Dict - GeometryCollection}
    """

    includeGeom = shape(json.loads(include))
    excludeGeom = None
    if exclude is not None:
        excludeGeom = shape(json.loads(exclude))

    response = {
        "error": None,
        "buildings": {"type": "GeometryCollection", "geometries": []},
    }
    try:
        # Compute BB's
        if includeGeom.geom_type == "Polygon":
            includeGeom = [includeGeom]
        bbIncludes = [a.bounds for a in includeGeom]

        osmInclude = [getOSMNodes(bbox) for bbox in bbIncludes]

        # Combine all nodes into dict
        allNodes = getAllNodes(osmInclude)
        logging.info("Finished pulling OSM data")

        # Combine all includes into unique building keys:
        buildingNodes = getUniqueBuildingNodes(allNodes)
        buildingDict = {
            k: {
                "type": "Polygon",
                "coordinates": [
                    [[allNodes[n]["lon"], allNodes[n]["lat"]] for n in b["nodes"]]
                ],
            }
            for (k, b) in buildingNodes.items()
        }

        if callback:
            # Update Pipeline with Progress
            callback(
                len(buildingDict),
                {
                    "type": "GeometryCollection",
                    "geometries": [b for (k, b) in buildingDict.items()],
                },
            )

        # Filter Buildings
        filteredBuildingsKeys, building_geojson_dict = filterBuildingNodes(
            buildingDict, includeGeom, excludeGeom
        )

        geometries = [building_geojson_dict[k] for k in filteredBuildingsKeys]
        response["buildings"] = {"type": "GeometryCollection", "geometries": geometries}

        return response

    except DjangoDbBaseError as e:
        logging.info("OSM query failed")
        response["error"] = str(e)
        raise e


def getMicrosoftBuildings(include, exclude, callback=None):
    """
    include - string - a GeoJson String
    exclude - string | None - a GeoJSON string or type  None
    returns a dict {'error' : string | None, 'buildings' : Dict GeometryCollection}
    """

    response = {
        "error": None,
        "buildings": {"type": "GeometryCollection", "geometries": []},
    }
    try:
        with connections["gis_data"].cursor() as cursor:
            offset = 0
            buildings = []
            while True:
                query_skeleton = "SELECT St_asgeojson(geog) FROM msftcombined WHERE {} LIMIT 10000 OFFSET %s;"
                query_skeleton = getQueryTemplate(
                    query_skeleton, exclude is not None, False
                )
                cursor.execute(
                    query_skeleton,
                    [include, exclude, offset]
                    if exclude is not None
                    else [include, offset],
                )
                polygons = [json.loads(row[0]) for row in cursor.fetchall()]
                buildings += polygons
                offset += len(polygons)
                if callback:
                    callback(
                        offset, {"type": "GeometryCollection", "geometries": buildings}
                    )
                if len(polygons) == 0:
                    break
            response["buildings"] = {
                "type": "GeometryCollection",
                "geometries": buildings,
            }
            return response
    except DjangoDbBaseError as e:
        logging.info("Failed to get buildings")
        response["error"] = str(e)
    return response


def getMicrosoftBuildingsOffset(include, offset, read_only):
    resp = {"gc": {"type": "GeometryCollection", "geometries": []}, "offset": "0"}
    try:
        with connections[select_gis_database(read_only)].cursor() as cursor:
            query_skeleton = """
            WITH subdivided_request AS
            (SELECT ST_Subdivide(
                ST_MakeValid(ST_GeomFromGeoJSON(%s)), 32) as include_subdivide
            ),
            intersected_buildings AS
            (SELECT geog::geometry as geom, gid FROM msftcombined JOIN subdivided_request
            ON ST_intersects(subdivided_request.include_subdivide, geog)
                WHERE ST_intersects(subdivided_request.include_subdivide, geog) AND
                gid > %s
                ORDER BY gid ASC
                LIMIT 10000
            )
            SELECT MAX(gid) as gid, ST_asgeojson(ST_ForceCollection(ST_Collect(geom))) FROM intersected_buildings;
            """
            # query_skeleton = getQueryTemplate(
            #     query_skeleton, exclude is not None, False)
            cursor.execute(query_skeleton, [include, offset])
            db_resp = cursor.fetchone()

            if db_resp[1] is None:
                resp = {
                    "gc": {"type": "GeometryCollection", "geometries": []},
                    "offset": str(0),
                }
            else:
                resp = {"gc": json.loads(db_resp[1]), "offset": str(db_resp[0])}
    except DjangoDbBaseError:
        resp = {
            "gc": {"type": "GeometryCollection", "geometries": []},
            "offset": str(-1),
        }
    return resp


def caTechToTechCode(techArr):
    """
    Converts Canadian tech descriptions (ex. Fixed Wireless, DSL, Fibre to home) to codes used on FE.
    """
    return [CA_TECHCODES.get(tech, -1) for tech in techArr]
