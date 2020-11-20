from IspToolboxApp.Tasks.MarketEvaluatorHelpers import getQueryTemplate, checkIfPolyInCanada, caTechToTechCode
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


def broadbandNow(include):
    with connections['gis_data'].cursor() as cursor:
        cursor.execute(broadbandnow_skeleton, [include])
        column_names = cursor.description
        rows = [row for row in cursor.fetchall()]
        return {col.name: [str(row[idx]) for row in rows]
                for idx, col in enumerate(column_names)}


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
            """SELECT cbg_id, state_abbr, county, locations, reserve,St_asgeojson(geog)
            FROM auction_904_shp WHERE cbg_id = %s"""
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(query_skeleton, [cbgid])
            result = cursor.fetchone()
            resp = {
                'error': 0,
                'cbgid': result[0],
                'state': result[1],
                'county': result[2],
                'locations': result[3],
                'reserve_price': result[4],
                'geojson': result[5]}
    except BaseException:
        resp = {'error': -2}
    return resp


def zipGeog(zipcode):
    '''
        Returns geojson for provided zipcode.
    '''
    resp = {'error': -1}
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
    resp = {'error': -1}
    try:
        resp['geojson'] = Tl2019UsCounty.getCountyGeog(countycode, statecode)
    except BaseException:
        resp = {'error': -2}
    return resp


broadbandnow_skeleton = """
SELECT * FROM
    (
        SELECT geoid FROM tl_2019_us_county  WHERE St_intersects(geog, St_geomfromgeojson(%s))
    ) as intersect_county
    JOIN broadband_data_bbn
        ON "COUNTY ID" = CAST(geoid AS numeric)
;
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
