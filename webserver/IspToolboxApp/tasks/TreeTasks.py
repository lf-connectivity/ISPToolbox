from celery import shared_task
from IspToolboxApp.tasks.building_outline_task.building_outline_task import getTiles, getTileImages
import pickle
# import detectree as dtr
import tempfile
import boto3


@shared_task
def createTreeGeoTiff(id):
    # Load design

    # Load Images

    # Run Classifier

    # Store Result with Network Plan
    return None


def loadImagesFromMapBox(bounding_box):
    tiles = getTiles(bounding_box, level=15)
    images = getTileImages(tiles, level=15)
    image_fps = []
    for img in images:
        temp = tempfile.NamedTemporaryFile(suffix='.png')
        img.save(temp)
        temp.seek(0)
        image_fps.append(temp)
    return image_fps


def classifyTrees(images):
    # c = dtr.Classifier()
    c = None
    clf = None

    tmp = tempfile.TemporaryFile()
    s3 = boto3.client('s3')
    s3.download_fileobj(
        'isptoolbox-internal-blobs',
        'tree-files/classifier_detectree.pickle',
        tmp)
    tmp.seek(0)

    clf = pickle.load(tmp)
    classified_imgs = []
    for img in images:
        tree_raster = tempfile.NamedTemporaryFile(suffix='.tif')
        c.classify_img(img.name, clf=clf, output_filepath=tree_raster)
        classified_imgs.append(tree_raster)
    return classified_imgs
