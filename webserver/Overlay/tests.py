from django.test import TestCase
from Overlay.models import Overlay


class TestOverlayModels(TestCase):
    def test_overlay_get(self):
        test_overlay = Overlay.objects.filter(type="test").order_by(
            "created").first()

        if not test_overlay:
            test = Overlay(
                type="test",
                source_url="mapbox://test.fbce0d34",
                source_layer="test_layer",
            )
            test.save()

        self.assertEqual(test_overlay.source_url, "mapbox://test.fbce0d34")
        self.assertTrue(test_overlay.source_url, "test_layer")
