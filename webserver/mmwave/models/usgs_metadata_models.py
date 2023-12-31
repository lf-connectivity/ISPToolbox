# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from datetime import datetime
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch.dispatcher import receiver
from IspToolboxApp.util import s3
from storages.backends.s3boto3 import S3Boto3Storage
from django.urls import reverse


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
    """
    Metadata about point clouds from USGS 3DEP Program

    Pulled from geojson @ usgs.entwine.io
    """
    name = models.CharField(max_length=8192)
    id_num = models.IntegerField(null=True, blank=True)
    count = models.BigIntegerField(help_text="Number of points in dataset")
    url = models.URLField()
    boundary = gis_models.GeometryField()
    srs = models.IntegerField()
    high_resolution_boundary = gis_models.GeometryField(
        null=True, blank=True, default=None,
        help_text="""
            Default boundary is low resolution and might miss some areas,
            this is a higher resolution boundary that is expensive to produce
        """
    )
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
    inspected = models.BooleanField(
        default=False,
        help_text="""
            Point cloud has been inspected by admin for noisy data
        """
    )

    @property
    def tiled(self):
        return LidarDSMTileModel.objects.filter(cld=self).exists()

    @property
    def number_of_tiles(self):
        return LidarDSMTileModel.objects.filter(cld=self).count()

    @classmethod
    def query_intersect_aoi(cls, aoi: GEOSGeometry):
        query = (
            cls.objects.filter(
                high_resolution_boundary__isnull=True,
                boundary__intersects=aoi
            ) |
            cls.objects.filter(
                high_resolution_boundary__isnull=False,
                high_resolution_boundary__intersects=aoi
            )
        )
        return query.all()

    def admin_url(self):
        info = (self._meta.app_label, self._meta.model_name)
        return reverse('admin:%s_%s_change' % info, args=(self.pk,))

    @property
    def collection_start_date(self):
        try:
            metadata = USGSLidarMetaDataModel.objects.get(workunit=self.name)
            return datetime.strptime(metadata.collect_start, '%Y-%m-%d')
        except Exception:
            return datetime.min

    def s3_tile_directory_exists(self, **kwargs):
        return s3.checkPrefixExists(self.get_s3_folder_key(**kwargs))

    def get_s3_folder_key(self, **kwargs):
        if settings.PROD or kwargs.get('tile_prod', True):
            key = f'tiles/{self.name}/'
        else:
            key = f'test-tiles/{self.name}/'
        return key

    def get_s3_key_tile(self, x, y, z, **kwargs):
        folder = self.get_s3_prefix()
        return f'{folder}{int(z)}/{int(x)}/{int(y)}.tif'

    def get_s3_prefix(self):
        if settings.PROD:
            return f'dsm/tiles/{self.id}-{self.name}/'
        else:
            return s3.findPointCloudPrefix('dsm/tiles/', self.name)

    def existsTile(self, x, y, z, **kwargs):
        if settings.PROD:
            return LidarDSMTileModel.objects.filter(cld=self, x=x, y=y, zoom=z).exists()
        # Check S3 - we are in local environment - lidar dsm tile models not populated
        else:
            size = s3.getObjectSize(
                self.get_s3_key_tile(x, y, z, **kwargs))
            if size is None:
                return False
            else:
                return size > 0

    # TODO achong: remove
    def getTile(self, x, y, z, fp, **kwargs):
        return s3.readFromS3(self.get_s3_key_tile(x, y, z, **kwargs), fp)


class TileModel(models.Model, s3.S3PublicExportMixin):
    """
    Slippy Tile that points to binary blob with DSM data
    """
    zoom = models.IntegerField(db_index=True)
    x = models.IntegerField(db_index=True)
    y = models.IntegerField(db_index=True)
    created = models.DateTimeField(auto_now_add=True)

    bucket_name = 'isptoolbox-export-file'
    tile = models.FileField(
        storage=S3Boto3Storage(bucket_name=bucket_name),
    )

    class Meta:
        unique_together = [['x', 'y', 'z']]
        abstract = True

    def save_tile(self, content, save=True):
        return self.tile.save(self.get_s3_key(), content, save)

    def getTile(self, fp, **kwargs):
        return self.read_object(fp)

    def existsTile(self, **kwargs):
        return self.check_object()


class LidarDSMTileModel(TileModel):
    """
    Slippy Tile that is associated with Lidar point cloud
    """
    cld = models.ForeignKey(EPTLidarPointCloud, on_delete=models.CASCADE)
    bucket_name = 'isptoolbox-export-file'

    class Meta:
        unique_together = [['x', 'y', 'zoom', 'cld']]

    def upload_to_path(instance, filename):
        prefix = "dsm/tiles_test"
        if settings.PROD:
            prefix = "dsm/tiles"
        cloud_name = f"{instance.cld.pk}-{instance.cld.name}"
        return f"{prefix}/{cloud_name}/{instance.zoom}/{instance.x}/{instance.y}.tif"

    tile = models.FileField(
        upload_to=upload_to_path,
        storage=S3Boto3Storage(bucket_name=bucket_name, location=''),
    )

    def get_s3_key(self, **kwargs):
        return self.cld.get_s3_key_tile(self.x, self.y, self.z, **kwargs)


@receiver(post_delete, sender=LidarDSMTileModel)
def cleanup_tile(sender, instance, using, **kwargs):
    """
    Delete file in S3 if we delete the model in the database
    """
    instance.tile.delete(save=False)


class USGSLidarMetaDataModel(models.Model):
    """
    This model is based on the USGS WESM gpkg file that contains
    metadata on the point clouds
    """
    workunit = models.CharField(max_length=255)
    workunit_id = models.IntegerField(null=True)
    project = models.CharField(
        max_length=255, null=True, db_column='workpackage')
    project_id = models.IntegerField(null=True, db_column='workpackage_id')
    collect_start = models.CharField(max_length=255)
    collect_end = models.CharField(max_length=255)
    ql = models.CharField(max_length=255)
    spec = models.CharField(
        max_length=255,
        help_text="USGS lidar specification 1.0 - LAS1.2 if >USGS 1.0 - LAS1.4"
    )
    p_method = models.CharField(max_length=255)
    dem_gsd_meters = models.FloatField(null=True)
    horiz_crs = models.CharField(max_length=255)
    vert_crs = models.CharField(max_length=255)
    lpc_pub_date = models.CharField(max_length=255, null=True)
    lpc_category = models.CharField(max_length=255)
    lpc_reason = models.CharField(max_length=255)
    opr_pub_date = models.CharField(max_length=255, null=True)
    opr_category = models.CharField(max_length=255)
    opr_reason = models.CharField(max_length=255)
    onemeter_category = models.CharField(max_length=255)
    onemeter_reason = models.CharField(max_length=255, null=True)
    seamless_category = models.CharField(max_length=255, null=True)
    seamless_reason = models.CharField(max_length=255, null=True)
    lpc_link = models.CharField(max_length=255, null=True)
    opr_link = models.CharField(max_length=255, null=True)
    metadata_link = models.CharField(max_length=255, null=True)
