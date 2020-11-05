from django.db import models
from django.contrib.gis.db import models as gis_models


class BuildingDetection(models.Model):
    task = models.CharField(
        max_length=100,
        db_index=True,
        blank=True,
        null=True)
    created = models.DateTimeField(auto_now_add=True)
    input_geometryCollection = gis_models.GeometryField()
    imagesToLoad = models.IntegerField(default=0)
    imagesLoaded = models.IntegerField(default=0)
    inferencesRun = models.IntegerField(default=0)
    inferenceComplete = models.BooleanField(default=False)
    thresholdComplete = models.BooleanField(default=False)
    polygonalizationComplete = models.BooleanField(default=False)
    output_geometryCollection = gis_models.GeometryCollectionField(
        blank=True, null=True)
    completed = models.DateTimeField(blank=True, null=True)
    error = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.task
