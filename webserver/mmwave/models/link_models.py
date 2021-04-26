from django.db import models
from django.contrib.gis.db import models as gis_models
import uuid
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat
from django.conf import settings
from IspToolboxApp.util import s3


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

    freq = models.FloatField(default=0)

    def linklength_m(self):
        return str(geopy_distance(lonlat(self.tx.x, self.tx.y), lonlat(self.rx.x, self.rx.y)).meters)


class EPTLidarPointCloudManager(models.Manager):
    """
    This Manager is used to filter out the point clouds that have data / boundary issues
    """
    def get_queryset(self):
        return super(EPTLidarPointCloudManager, self).get_queryset().filter(valid=True)


class EPTLidarPointCloudManagerAll(models.Manager):
    """
    This Manager includes all point clouds, even the ones that have been marked invalid
    """
    def get_queryset(self):
        return super(EPTLidarPointCloudManagerAll, self).get_queryset()


class EPTLidarPointCloud(models.Model):
    name = models.CharField(max_length=8192)
    id_num = models.IntegerField(null=True, blank=True)
    count = models.BigIntegerField()
    url = models.URLField()
    boundary = gis_models.GeometryField()
    srs = models.IntegerField()
    high_resolution_boundary = gis_models.GeometryField(null=True, blank=True, default=None)
    date_time_added_to_isptoolbox = models.DateTimeField(auto_now_add=True)

    objects = EPTLidarPointCloudManager()
    objects_include_invalid = EPTLidarPointCloudManagerAll()

    valid = models.BooleanField(
        default=True,
        help_text="""
            Used to invalidate certain point clouds if the USGS says they are bad / have data issues
        """
    )
    noisy_data = models.BooleanField(
        default=False,
        help_text="""
            dataset is noisy and requires outlier filtering for it to be usable
        """
    )

    def get_s3_key_tile(self, x, y, z, **kwargs):
        if settings.PROD or kwargs.get('tile_prod'):
            key = f'tiles/{self.name}/{int(z)}/{int(x)}/{int(y)}/tile{kwargs.get("suffix")}'
        else:
            key = f'test-tiles/{self.name}/{int(z)}/{int(x)}/{int(y)}/tile{kwargs.get("suffix")}'
        return key

    def getTile(self, x, y, z, fp, **kwargs):
        return s3.readFromS3(self.get_s3_key_tile(x, y, z, **kwargs), fp)

    def createTile(self, x, y, z, fp, **kwargs):
        return s3.writeS3Object(self.get_s3_key_tile(x, y, z, **kwargs), fp)

    def deleteTile(self, x, y, z, **kwargs):
        return s3.deleteS3Object(self.get_s3_key_tile(x, y, z, **kwargs))

    def existsTile(self, x, y, z, **kwargs):
        return s3.checkObjectExists(self.get_s3_key_tile(x, y, z, **kwargs))


class LOSSummary(TGLink):
    class Meta:
        proxy = True
        verbose_name = 'LOS Summary'
        verbose_name_plural = 'LOS Summary'
