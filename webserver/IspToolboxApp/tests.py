from django.test import TestCase
import IspToolboxApp.tasks as tasks
from shutil import copyfile

# Create your tests here.
# class SimpleUSGeoJsonTests(TestCase):
#     def test_single_polygon(self):

class TestDetectTree(TestCase):
    def test_loading_images(self):
        bb = [-121.1252439022064, 37.480579692661436, -121.12149953842162, 37.4824186878121]
        imgs = tasks.loadImagesFromMapBox(bb)
        for idx, img in enumerate(imgs):
            copyfile(img.name, str(idx) + '.png')
        
        classified_imgs = tasks.classifyTrees(imgs)
        for idx, img in enumerate(classified_imgs):
            copyfile(img.name, str(idx) + '.tif')

        
