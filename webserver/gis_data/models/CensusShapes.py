# (c) Meta Platforms, Inc. and affiliates. Copyright
# This is an auto-generated Django model module.
#   * Make sure each model has one field with primary_key=True
from django.contrib.gis.db import models
from django.db import connections
from IspToolboxApp.Helpers.MarketEvaluatorHelpers import select_gis_database


class CensusBlockGroup(models.Model):
    """
    Census Block Groups 2019 imported from census.gov website shapefile
    """
    gid = models.AutoField(primary_key=True)
    statefp = models.CharField(max_length=2, blank=True, null=True)
    countyfp = models.CharField(max_length=3, blank=True, null=True)
    tractce = models.CharField(max_length=6, blank=True, null=True)
    blkgrpce = models.CharField(max_length=1, blank=True, null=True)
    geoid = models.CharField(max_length=12, blank=True, null=True)
    namelsad = models.CharField(max_length=13, blank=True, null=True)
    mtfcc = models.CharField(max_length=5, blank=True, null=True)
    funcstat = models.CharField(max_length=1, blank=True, null=True)
    aland = models.FloatField(blank=True, null=True)
    awater = models.FloatField(blank=True, null=True)
    intptlat = models.CharField(max_length=11, blank=True, null=True)
    intptlon = models.CharField(max_length=12, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)
    geog = models.MultiPolygonField(geography=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tl_2019_bg'


class Tl2019UsCounty(models.Model):
    gid = models.AutoField(primary_key=True)
    statefp = models.CharField(max_length=2, blank=True, null=True)
    countyfp = models.CharField(max_length=3, blank=True, null=True)
    countyns = models.CharField(max_length=8, blank=True, null=True)
    geoid = models.CharField(max_length=5, blank=True, null=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    namelsad = models.CharField(max_length=100, blank=True, null=True)
    lsad = models.CharField(max_length=2, blank=True, null=True)
    classfp = models.CharField(max_length=2, blank=True, null=True)
    mtfcc = models.CharField(max_length=5, blank=True, null=True)
    csafp = models.CharField(max_length=3, blank=True, null=True)
    cbsafp = models.CharField(max_length=5, blank=True, null=True)
    metdivfp = models.CharField(max_length=5, blank=True, null=True)
    funcstat = models.CharField(max_length=1, blank=True, null=True)
    aland = models.FloatField(blank=True, null=True)
    awater = models.FloatField(blank=True, null=True)
    intptlat = models.CharField(max_length=11, blank=True, null=True)
    intptlon = models.CharField(max_length=12, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)
    geog = models.MultiPolygonField(geography=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tl_2019_us_county'

    @staticmethod
    def getCountyGeog(countycode, statecode):
        '''
            Returns geojson for provided county and statecodes.
        '''
        query_skeleton = \
            f"""
            SELECT ST_asgeojson(geog)
            FROM {Tl2019UsCounty._meta.db_table}
            WHERE countyfp = %s AND statefp = %s
            """
        with connections[select_gis_database(read_replica=True)].cursor() as cursor:
            cursor.execute(query_skeleton, [countycode, statecode])
            result = cursor.fetchone()
            return result[0]


class Tl2020UsCensusBlocks(models.Model):
    gid = models.AutoField(primary_key=True)
    statefp20 = models.CharField(max_length=2, blank=True, null=True)
    countyfp20 = models.CharField(max_length=3, blank=True, null=True)
    tractce20 = models.CharField(max_length=6, blank=True, null=True)
    blockce20 = models.CharField(max_length=4, blank=True, null=True)
    geoid20 = models.CharField(max_length=15, blank=True, null=True)
    name20 = models.CharField(max_length=10, blank=True, null=True)
    mtfcc20 = models.CharField(max_length=5, blank=True, null=True)
    ur20 = models.CharField(max_length=1, blank=True, null=True)
    uace20 = models.CharField(max_length=5, blank=True, null=True)
    uatype20 = models.CharField(max_length=1, blank=True, null=True)
    funcstat20 = models.CharField(max_length=1, blank=True, null=True)
    aland20 = models.FloatField(blank=True, null=True)
    awater20 = models.FloatField(blank=True, null=True)
    intptlat20 = models.CharField(max_length=11, blank=True, null=True)
    intptlon20 = models.CharField(max_length=12, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tl_2020_us_census_blocks'

    @staticmethod
    def getBlockGeog(blockcode):
        '''
            Returns geojson for provided blockcode.
        '''
        query_skeleton = \
            f"""
            SELECT ST_asgeojson(geom)
            FROM {Tl2020UsCensusBlocks._meta.db_table}
            WHERE geoid20 = %s
            """
        with connections[select_gis_database(read_replica=True)].cursor() as cursor:
            cursor.execute(query_skeleton, [blockcode])
            result = cursor.fetchone()
            return result[0]


class Tl2019UsZcta510(models.Model):
    gid = models.AutoField(primary_key=True)
    zcta5ce10 = models.CharField(max_length=5, blank=True, null=True)
    geoid10 = models.CharField(max_length=5, blank=True, null=True)
    classfp10 = models.CharField(max_length=2, blank=True, null=True)
    mtfcc10 = models.CharField(max_length=5, blank=True, null=True)
    funcstat10 = models.CharField(max_length=1, blank=True, null=True)
    aland10 = models.FloatField(blank=True, null=True)
    awater10 = models.FloatField(blank=True, null=True)
    intptlat10 = models.CharField(max_length=11, blank=True, null=True)
    intptlon10 = models.CharField(max_length=12, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tl_2019_us_zcta510'

    @staticmethod
    def getZipGeog(zipcode):
        '''
            Returns geojson for provided zipcode.
        '''
        query_skeleton = \
            f"""SELECT ST_asgeojson(geog)
            FROM {Tl2019UsZcta510._meta.db_table} WHERE zcta5ce10 = %s"""
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(query_skeleton, [zipcode])
            result = cursor.fetchone()
            return result[0]


class TribalLands(models.Model):
    gid = models.AutoField(primary_key=True)
    aiannhce = models.CharField(max_length=4, blank=True, null=True)
    aiannhns = models.CharField(max_length=8, blank=True, null=True)
    geoid = models.CharField(max_length=5, blank=True, null=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    namelsad = models.CharField(max_length=100, blank=True, null=True)
    lsad = models.CharField(max_length=2, blank=True, null=True)
    classfp = models.CharField(max_length=2, blank=True, null=True)
    comptyp = models.CharField(max_length=1, blank=True, null=True)
    aiannhr = models.CharField(max_length=1, blank=True, null=True)
    mtfcc = models.CharField(max_length=5, blank=True, null=True)
    funcstat = models.CharField(max_length=1, blank=True, null=True)
    aland = models.FloatField(blank=True, null=True)
    awater = models.FloatField(blank=True, null=True)
    intptlat = models.CharField(max_length=11, blank=True, null=True)
    intptlon = models.CharField(max_length=12, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tribal_lands'

    @staticmethod
    def getTribalGeog(geoid):
        '''
            Returns geojson for provided tribal geoid.
        '''
        query_skeleton = \
            f"""SELECT ST_asgeojson(geom)
            FROM {TribalLands._meta.db_table} WHERE geoid = %s"""
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(query_skeleton, [geoid])
            result = cursor.fetchone()
            return result[0]
