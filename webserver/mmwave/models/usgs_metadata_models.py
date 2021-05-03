from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from datetime import datetime
from django.conf import settings
from IspToolboxApp.util import s3


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
        folder = self.get_s3_folder_key(**kwargs)
        if settings.PROD or kwargs.get('tile_prod', True):
            key = f'{folder}{int(z)}/{int(x)}/{int(y)}/tile{kwargs.get("suffix", ".tif")}'
        else:
            key = f'{folder}{int(z)}/{int(x)}/{int(y)}/tile{kwargs.get("suffix", ".tif")}'
        return key

    def getTile(self, x, y, z, fp, **kwargs):
        return s3.readFromS3(self.get_s3_key_tile(x, y, z, **kwargs), fp)

    def createTile(self, x, y, z, fp, **kwargs):
        return s3.writeS3Object(self.get_s3_key_tile(x, y, z, **kwargs), fp)

    def deleteTile(self, x, y, z, **kwargs):
        return s3.deleteS3Object(self.get_s3_key_tile(x, y, z, **kwargs))

    def existsTile(self, x, y, z, **kwargs):
        return s3.checkObjectExists(self.get_s3_key_tile(x, y, z, **kwargs))


class USGSLidarMetaDataModel(models.Model):
    """
    This model is based on the USGS WESM gpkg file that contains
    metadata on the point clouds
    """
    workunit = models.CharField(max_length=255)
    workunit_id = models.IntegerField(null=True)
    project = models.CharField(max_length=255, null=True, db_column='workpackage')
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
