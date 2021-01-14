from django.db import models
from django.contrib.gis.db import models as gis_models
import uuid
from django.db import connections


# Create your models here.
class TGLink(models.Model):
    # metadata
    uuid = models.CharField(
        max_length=50,
        primary_key=True,
        default=uuid.uuid4,
        editable=False)
    created = models.DateTimeField(auto_now_add=True)

    tx = gis_models.PointField()
    rx = gis_models.PointField()
    fbid = models.BigIntegerField(null=True, blank=True, db_index=True)
    building_start = models.BigIntegerField(null=True, blank=True)
    building_end = models.BigIntegerField(null=True, blank=True)


class EPTLidarPointCloud(models.Model):
    name = models.CharField(max_length=8192)
    id_num = models.IntegerField(null=True, blank=True)
    count = models.BigIntegerField()
    url = models.URLField()
    boundary = gis_models.GeometryField()
    srs = models.IntegerField()
    high_resolution_boundary = gis_models.GeometryField(null=True, blank=True, default=None)


# unmanaged models
class Msftcombined(models.Model):
    gid = models.IntegerField(blank=True, null=True)
    province = models.TextField(blank=True, null=True)
    geog = gis_models.PolygonField(geography=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'msftcombined'


class TreeCanopy(models.Model):
    rid = models.AutoField(primary_key=True)
    rast = gis_models.RasterField(blank=True, null=True)
    filename = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'tree_canopy'

    @staticmethod
    def getPointValue(pt):
        pt.srid = 4326
        with connections['gis_data'].cursor() as cursor:
            cursor.execute(TreeCanopy.point_query, [pt.ewkt, pt.ewkt])
            row = cursor.fetchone()
            return row[0]
        return 0

    point_query = """
    SELECT
        ST_Value(
            "tree_canopy"."rast",
            ST_transform(ST_GeomFromEWKT(%s), 42303))
    FROM "tree_canopy" WHERE
        ST_Intersects("tree_canopy"."rast", ST_transform(ST_GeomFromEWKT(%s), 42303));"""


class LOSSummary(TGLink):
    class Meta:
        proxy = True
        verbose_name = 'LOS Summary'
        verbose_name_plural = 'LOS Summary'
