# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
# Generated with: python manage.py inspectdb --database gis_data tl_2019_us_county tl_2019_us_zcta510
from django.contrib.gis.db import models
from django.db import connections


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
            Returns geojson for provided zipcode.
        '''
        query_skeleton = \
            f"""
            SELECT ST_asgeojson(geog)
            FROM {Tl2019UsCounty._meta.db_table}
            WHERE countyfp = %s AND statefp = %s
            """
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(query_skeleton, [countycode, statecode])
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
