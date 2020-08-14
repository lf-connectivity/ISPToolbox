from django.db import models
from django.contrib.gis.db import models as gis_models
from IspToolboxApp.Models.mmWaveModels import *

from wagtail.core.models import Page
from wagtail.core.fields import RichTextField
from wagtail.admin.edit_handlers import FieldPanel
from wagtail.search import index

class HomePage(Page):
    body = RichTextField(blank=True)

    content_panels = Page.content_panels + [
        FieldPanel('body', classname="full"),
    ]

class BlogPage(Page):
    date = models.DateField("Post date")
    intro = models.CharField(max_length=250)
    body = RichTextField(blank=True)

    search_fields = Page.search_fields + [
        index.SearchField('intro'),
        index.SearchField('body'),
    ]

    content_panels = Page.content_panels + [
        FieldPanel('date'),
        FieldPanel('intro'),
        FieldPanel('body', classname="full"),
    ]
# Create your models here.

class BuildingDetection(models.Model):
    task = models.CharField(max_length=100, db_index=True, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    input_geometryCollection = gis_models.GeometryField()
    imagesToLoad = models.IntegerField(default=0)
    imagesLoaded = models.IntegerField(default=0)
    inferencesRun = models.IntegerField(default=0)
    inferenceComplete = models.BooleanField(default=False)
    thresholdComplete = models.BooleanField(default=False)
    polygonalizationComplete = models.BooleanField(default=False)
    output_geometryCollection = gis_models.GeometryCollectionField(blank=True, null=True)
    completed = models.DateTimeField(blank=True, null=True)
    error = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.task