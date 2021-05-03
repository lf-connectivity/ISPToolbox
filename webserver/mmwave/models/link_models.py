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


class LOSSummary(TGLink):
    class Meta:
        proxy = True
        verbose_name = 'LOS Summary'
        verbose_name_plural = 'LOS Summary'
