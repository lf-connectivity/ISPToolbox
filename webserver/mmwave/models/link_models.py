from django.db import models
from django.contrib.gis.db import models as gis_models
import uuid
from geopy.distance import distance as geopy_distance
from geopy.distance import lonlat


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
    def get_queryset(self):
        return super(EPTLidarPointCloudManager, self).get_queryset().filter(valid=True)


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

    valid = models.BooleanField(
        default=True,
        help_text="""
            Used to invalidate certain point clouds if the USGS says they are bad / have data issues
        """
    )


class LOSSummary(TGLink):
    class Meta:
        proxy = True
        verbose_name = 'LOS Summary'
        verbose_name_plural = 'LOS Summary'
