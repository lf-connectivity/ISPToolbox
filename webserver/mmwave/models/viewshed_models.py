from django.db import models
from django.contrib.gis.db import models as gis_models
import uuid
from django.conf import settings
from IspToolboxApp.util.s3 import S3PublicExportMixin
from enum import Enum


class ViewshedModeOptionsEnum(Enum):
    VISIBLE = "VISIBLE"
    DEM = "DEM"
    GROUND = "GROUND"


class ViewShedJob(models.Model, S3PublicExportMixin):
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        primary_key=True,
        unique=True
    )
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    observer = gis_models.PointField()
    observer_height = models.FloatField()
    target_height = models.FloatField()
    radius = models.FloatField()

    mode = models.CharField(
        default=ViewshedModeOptionsEnum.VISIBLE.value,
        max_length=20,
        choices=[(tag, tag.value) for tag in ViewshedModeOptionsEnum]
    )
    created = models.DateTimeField(auto_now_add=True)

    def delete(self):
        self.delete_object()
        super(ViewShedJob, self).delete()

    def get_s3_key(self, **kwargs):
        if settings.PROD:
            key = 'viewshed/viewshed-' + str(self.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        else:
            key = 'viewshed/test-viewshed-' + str(self.uuid) + ('.tif' if kwargs.get('tif') else '.png')
        return key
