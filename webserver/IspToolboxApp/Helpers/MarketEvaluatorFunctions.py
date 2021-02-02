from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getQueryTemplate, checkIfPolyInCanada, caTechToTechCode, \
    checkIfPrecomputedIncomeAvailable
from IspToolboxApp.Models.MLabSpeedDataModels import StandardizedMlab, StandardizedPostal
from IspToolboxApp.Models.GeographicModels import Tl2019UsZcta510, Tl2019UsCounty
from django.db import connections


def serviceProviders(include):
    if checkIfPolyInCanada(include, None):
        return genServiceProvidersCanada(include)
    return genServiceProvidersUS(include)


def genServiceProvidersUS(include):
    '''
        Grabs service provider data for US queries.
    '''
    query_skeleton = getQueryTemplate(provider_skeleton, None, False)
    with connections['gis_data'].cursor() as cursor:
        cursor.execute(
            query_skeleton, [include])
        rows = [row for row in cursor.fetchall()]
        competitors = [row[0] for row in rows]
        maxdown = [row[1] for row in rows]
        maxup = [row[2] for row in rows]
        tech = [row[3] for row in rows]
        resp = {
            'error': 0,
            'competitors': competitors,
            "down_ad_speed": maxdown,
            "up_ad_speed": maxup,
            "tech_used": tech}
        return resp


def genServiceProvidersCanada(include):
    '''
        Grabs service provider data for Canadian queries.
    '''
    query_skeleton = getQueryTemplate(provider_skeleton_ca, None, False)
    with connections['gis_data'].cursor() as cursor:
        cursor.execute(
            query_skeleton, [include])
        rows = [row for row in cursor.fetchall()]
        competitors = [row[0] for row in rows]
        tech = [caTechToTechCode(row[1]) for row in rows]
        resp = {
            'error': 0,
            'competitors': competitors,
            'tech_used': tech
        }
        return resp


def medianIncome(include, result = {}):
    precomputedAvailable = checkIfPrecomputedIncomeAvailable(include, None)
    done = False
    if precomputedAvailable:
        try:
            with connections['gis_data'].cursor() as cursor:
                max_gid = result.get('max_gid', 0)
                query_arguments = [include, max_gid]
                cursor.execute(income_skeleton, query_arguments)
                row = cursor.fetchone()
                columns = [col[0] for col in cursor.description]
                row_dict = dict(zip(columns, row))
                if row_dict.get('numbuildings', 0) == 0:
                    done = True

                averageMedianIncome = float(row_dict['avgincome2018']) if row_dict['avgincome2018'] is not None else 0
                return {'averageMedianIncome': averageMedianIncome, 'max_gid' : row_dict['max_gid'], 'numbuildings': row_dict['numbuildings'], 'done' : done}
        except BaseException as e:
            return {'averageMedianIncome': 0, 'error': str(e), 'done' : done}
    else:
        done = True
        query_skeleton = income_skeleton_simple
        try:
            query_skeleton = getQueryTemplate(query_skeleton, False, False)
            averageMedianIncome = 0
            with connections['gis_data'].cursor() as cursor:
                query_arguments = [include]
                cursor.execute(query_skeleton, query_arguments)
                results = cursor.fetchone()
                averageMedianIncome = results[0]
            return {'averageMedianIncome': averageMedianIncome, 'done' : done}
        except BaseException as e:
            return {'averageMedianIncome': 0, 'error': str(e), 'done' : done}


def broadbandNow(include):
    with connections['gis_data'].cursor() as cursor:
        cursor.execute(broadbandnow_skeleton, [include])
        row = cursor.fetchone()

        # NULL = no information
        min_price = str(row[0]) if row[0] else None

        return {'minimumBroadbandPrice': min_price}

# flake8: noqa
def mlabSpeed(include):
    mlab_query = f"""
        WITH intersecting_geog AS
        (
            SELECT *, ST_Area(ST_Intersection(geog, ST_GeomFromGeoJSON(%s)))/ST_Area(ST_GeomFromGeoJSON(%s)::geography) as pct_area
            FROM {StandardizedPostal._meta.db_table}
            WHERE ST_Intersects(
                geog,
                ST_GeomFromGeoJSON(%s)
            )
        )
        SELECT postalcode as "Zipcode", down as "Download (Mbit/s)", up as "Upload (Mbit/s)", pct_area
        FROM {StandardizedMlab._meta.db_table}
            INNER JOIN intersecting_geog
            ON
            postalcode =
            intersecting_geog.code"""
    mlab_query_fallback = f"""
        WITH intersecting_geog AS
        (
            SELECT * FROM {StandardizedPostal._meta.db_table}
            WHERE ST_Intersects(
                geog,
                ST_GeomFromGeoJSON(%s)
            )
        )
        SELECT postalcode as "Zipcode", down as "Download (Mbit/s)", up as "Upload (Mbit/s)"
        FROM {StandardizedMlab._meta.db_table}
            INNER JOIN intersecting_geog
            ON
            postalcode =
            intersecting_geog.code
    """
    try:
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(mlab_query, [include, include, include])
            columns = [col[0] for col in cursor.description]
            return [
                dict(zip(columns, [str(i) for i in row]))
                for row in cursor.fetchall()
            ]
    # Above query can fail due to self-intersecting polygons in complex multipolygon geometry cases.
    # In this case fallback to a simple average.
    except Exception:
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(mlab_query_fallback, [include])
            columns = [col[0] for col in cursor.description]
            return [
                dict(zip(columns, [str(i) for i in row]))
                for row in cursor.fetchall()
            ]


def grantGeog(cbgid):
    try:
        query_skeleton = \
            """SELECT cbg_id, St_asgeojson(geog)
            FROM auction_904_shp WHERE cbg_id = %s"""
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(query_skeleton, [cbgid])
            result = cursor.fetchone()
            resp = {
                'error': 0,
                'cbgid': result[0],
                'geojson': result[1]
                }
    except BaseException:
        resp = {'error': -2}
    return resp


def zipGeog(zipcode):
    '''
        Returns geojson for provided zipcode.
    '''
    resp = {'error': 0}
    try:
        resp['geojson'] = Tl2019UsZcta510.getZipGeog(zipcode)
        resp['zip'] = zipcode
    except BaseException:
        resp = {'error': -2}
    return resp


def countyGeog(statecode, countycode):
    '''
        Returns geojson for provided statecode and countycode.
    '''
    resp = {'error': 0}
    try:
        resp['geojson'] = Tl2019UsCounty.getCountyGeog(countycode, statecode)
        resp['statecode'] = statecode
        resp['countycode'] = countycode
    except BaseException:
        resp = {'error': -2}
    return resp

broadbandnow_skeleton = """
SELECT MIN(bbn.minprice_broadband_plan_terrestrial)
FROM broadbandnow as bbn
    JOIN tl_2019_blocks_census as cen
    ON cen.geoid10 = bbn.block_id
WHERE ST_Intersects(cen.geog, ST_GeomFromGeoJSON(%s))
"""

provider_skeleton = """
SELECT providername,
    Max(maxaddown)               AS maxdown,
    Max(maxadup)                 AS maxadup,
    Array_agg(DISTINCT techcode) AS tech
FROM   form477jun2019
    JOIN tl_2019_blocks_census
      ON tl_2019_blocks_census.geoid10 = form477jun2019.blockcode
WHERE  {}
    AND consumer > 0
GROUP  BY providername
ORDER  BY maxdown DESC;
"""


provider_skeleton_ca = """
SELECT providername,
    Array_agg(DISTINCT tech) as techarr
FROM ca_hex_broadband
    JOIN ca_hex
    ON ca_hex.geoid = ca_hex_broadband.hex
WHERE {} AND tech != 'Mobile Wireless'
GROUP BY providername;
"""


income_skeleton = """
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
),
unnested_intersecting_footprints AS 
(
    SELECT intersected_buildings.*, UNNEST(microsoftfootprint2tracts.tractgids) AS tractgid
    FROM intersected_buildings LEFT JOIN
        microsoftfootprint2tracts ON
        intersected_buildings.gid = microsoftfootprint2tracts.footprintgid
),
building_median_income AS
(
    SELECT unnested_intersecting_footprints.gid, AVG(tract.income2018) AS avgincome2018building
    FROM unnested_intersecting_footprints LEFT JOIN tract
        ON tract.gid = unnested_intersecting_footprints.tractgid
    GROUP BY unnested_intersecting_footprints.gid
)
SELECT AVG(building_median_income.avgincome2018building) AS avgincome2018, COUNT(*) as numbuildings, MAX(gid) as max_gid
FROM building_median_income
"""


income_skeleton_simple = """
SELECT AVG(median_household_income) AS avgincome2018
FROM standardized_median_income
JOIN standardized_subdivisions ON standardized_median_income.geoid = standardized_subdivisions.geoid WHERE {};
"""