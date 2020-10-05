# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.

# GENERATED USING: python manage.py inspectdb --database gis_data  tl_2019_us_zcta510 mlab_uszip_10_5_2020
from django.contrib.gis.db import models


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


class MlabUszip1052020(models.Model):
    state = models.CharField(db_column='State', max_length=-1)  # Field name made lowercase.
    zipcode = models.DecimalField(db_column='Zipcode', max_digits=65535, decimal_places=65535)  # Field name made lowercase.
    download_mbit_s_field = models.DecimalField(db_column='Download (Mbit/s)', max_digits=65535, decimal_places=65535)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    upload_mbit_s_field = models.DecimalField(db_column='Upload (Mbit/s)', max_digits=65535, decimal_places=65535)  # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.

    class Meta:
        managed = False
        db_table = 'mlab_uszip_10_5_2020'
