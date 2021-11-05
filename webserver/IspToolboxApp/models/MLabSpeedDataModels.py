# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.

# GENERATED USING: python manage.py inspectdb --database gis_data mlab_uszip_10_5_2020
from django.contrib.gis.db import models
from django.db import connections


class MlabUszip1052020(models.Model):
    # Field name made lowercase.
    state = models.CharField(db_column='State', max_length=5)
    # Field name made lowercase.
    zipcode = models.DecimalField(
        db_column='Zipcode', max_digits=65535, decimal_places=65535)
    # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    download_mbit_s_field = models.DecimalField(
        db_column='Download (Mbit/s)', max_digits=65535, decimal_places=65535)
    # Field name made lowercase. Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    upload_mbit_s_field = models.DecimalField(
        db_column='Upload (Mbit/s)', max_digits=65535, decimal_places=65535)

    class Meta:
        managed = False
        db_table = 'mlab_uszip_10_5_2020'


class StandardizedMlab(models.Model):
    down = models.DecimalField(
        db_column='down', max_digits=65535, decimal_places=65535, blank=True, null=True)
    up = models.DecimalField(
        db_column='up', max_digits=65535, decimal_places=65535, blank=True, null=True)
    postalcode = models.CharField(
        db_column='postalcode', max_length=10, blank=True, null=True)
    iso2 = models.CharField(max_length=2, blank=True, null=True)
    geom = models.PointField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'standardized_mlab'

    @staticmethod
    # flake8: noqa
    def genMLabResults(area_of_interest):
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
                areaJson = area_of_interest.json
                cursor.execute(mlab_query, [areaJson, areaJson, areaJson])
                columns = [col[0] for col in cursor.description]
                return [
                    dict(zip(columns, row))
                    for row in cursor.fetchall()
                ]
        # Above query can fail due to self-intersecting polygons in complex multipolygon geometry cases.  In this case fallback to a simple average.
        except Exception:
            with connections['gis_data'].cursor() as cursor:
                areaJson = area_of_interest.json
                cursor.execute(mlab_query_fallback, [areaJson])
                columns = [col[0] for col in cursor.description]
                return [
                    dict(zip(columns, row))
                    for row in cursor.fetchall()
                ]


class StandardizedPostal(models.Model):
    gid = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, blank=True, null=True)
    code = models.CharField(max_length=10, blank=True, null=True)
    geog = models.MultiPolygonField(geography=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'standardized_postal'


class StandardizedMlabGlobal(models.Model):
    down = models.DecimalField(
        max_digits=65535, decimal_places=65535, blank=True, null=True)
    up = models.DecimalField(
        max_digits=65535, decimal_places=65535, blank=True, null=True)
    postalcode = models.CharField(max_length=10, blank=True, null=True)
    iso2 = models.CharField(max_length=2, blank=True, null=True)
    geom = models.PointField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'standardized_mlab_global'
        unique_together = (('postalcode', 'iso2'),)


class Gadm36Bra2(models.Model):
    """
    Gadm Boundaries for Brazil
    """
    gid = models.AutoField(primary_key=True)
    gid_0 = models.CharField(max_length=80, blank=True, null=True)
    name_0 = models.CharField(max_length=80, blank=True, null=True)
    gid_1 = models.CharField(max_length=80, blank=True, null=True)
    name_1 = models.CharField(max_length=80, blank=True, null=True)
    nl_name_1 = models.CharField(max_length=80, blank=True, null=True)
    gid_2 = models.CharField(max_length=80, blank=True, null=True)
    name_2 = models.CharField(max_length=80, blank=True, null=True)
    varname_2 = models.CharField(max_length=80, blank=True, null=True)
    nl_name_2 = models.CharField(max_length=80, blank=True, null=True)
    type_2 = models.CharField(max_length=80, blank=True, null=True)
    engtype_2 = models.CharField(max_length=80, blank=True, null=True)
    cc_2 = models.CharField(max_length=80, blank=True, null=True)
    hasc_2 = models.CharField(max_length=80, blank=True, null=True)
    geom = models.MultiPolygonField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'gadm36_bra_2'
