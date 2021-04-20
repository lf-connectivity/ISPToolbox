from django.db import models


class USGSLidarMetaDataModel(models.Model):
    """
    This model is based on the USGS WESM gpkg file that contains
    metadata on the point clouds
    """
    workunit = models.CharField(max_length=255)
    workunit_id = models.IntegerField(null=True)
    workpackage = models.CharField(max_length=255, null=True)
    workpackage_id = models.IntegerField(null=True)
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
    seamless_category = models.CharField(max_length=255)
    seamless_reason = models.CharField(max_length=255)
    lpc_link = models.CharField(max_length=255)
    opr_link = models.CharField(max_length=255)
    metadata_link = models.CharField(max_length=255)
