from django.db import models


class Overlay(models.Model):
    type = models.CharField(max_length=20)
    source_url = models.CharField(max_length=50)
    source_layer = models.CharField(max_length=50)
    created = models.DateTimeField(auto_now_add=True)

    @classmethod
    def getLatestOverlay(cls, type):
        try:
            return cls.objects.filter(type=type).order_by("created").first()
        except:  # noqa: E722
            return None
