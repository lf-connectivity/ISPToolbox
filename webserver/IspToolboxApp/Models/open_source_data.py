# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.contrib.gis.db import models

class Form477Jun2019(models.Model):
    logrecno = models.AutoField(primary_key=True)
    provider_id = models.IntegerField(blank=True, null=True)
    frn = models.IntegerField(blank=True, null=True)
    providername = models.CharField(max_length=255, blank=True, null=True)
    dbaname = models.CharField(max_length=255, blank=True, null=True)
    holdingcompanyname = models.CharField(max_length=255, blank=True, null=True)
    hoconum = models.IntegerField(blank=True, null=True)
    hocofinal = models.CharField(max_length=255, blank=True, null=True)
    stateabbr = models.CharField(max_length=20, blank=True, null=True)
    blockcode = models.CharField(max_length=15, blank=True, null=True)
    techcode = models.IntegerField(blank=True, null=True)
    consumer = models.IntegerField(blank=True, null=True)
    maxaddown = models.FloatField(blank=True, null=True)
    maxadup = models.FloatField(blank=True, null=True)
    business = models.FloatField(blank=True, null=True)
    maxcirdown = models.FloatField(blank=True, null=True)
    maxcirup = models.FloatField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'form477jun2019'

class Tl2019BlocksCensus(models.Model):
    gid = models.AutoField(primary_key=True)
    statefp10 = models.CharField(max_length=2, blank=True, null=True)
    countyfp10 = models.CharField(max_length=3, blank=True, null=True)
    tractce10 = models.CharField(max_length=6, blank=True, null=True)
    blockce10 = models.CharField(max_length=4, blank=True, null=True)
    geoid10 = models.CharField(max_length=15, blank=True, null=True)
    name10 = models.CharField(max_length=10, blank=True, null=True)
    mtfcc10 = models.CharField(max_length=5, blank=True, null=True)
    ur10 = models.CharField(max_length=1, blank=True, null=True)
    uace10 = models.CharField(max_length=5, blank=True, null=True)
    uatype = models.CharField(max_length=1, blank=True, null=True)
    funcstat10 = models.CharField(max_length=1, blank=True, null=True)
    aland10 = models.FloatField(blank=True, null=True)
    awater10 = models.FloatField(blank=True, null=True)
    intptlat10 = models.CharField(max_length=11, blank=True, null=True)
    intptlon10 = models.CharField(max_length=12, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)
    geog = models.MultiPolygonField(geography=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tl_2019_blocks_census'
