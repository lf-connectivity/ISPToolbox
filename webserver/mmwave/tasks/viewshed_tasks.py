from django.contrib.gis.geos import Point
import json
from celery import shared_task
import shlex
import subprocess
import tempfile
from mmwave.models import ViewShedJob, DSMConversionJob, DSMResolutionOptionsEnum
from workspace.models import AccessPointLocation
from workspace.utils.geojson_circle import destination
from mmwave.tasks.dsm_tasks import exportDSMData
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from IspToolboxAccounts.models import User
from rasterio import shutil
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from PIL import Image
import math
import numpy as np

DEFAULT_MAX_DISTANCE_KM = 3
DEFAULT_PROJECTION = 3857


def renderViewshed(viewshed_job_uuid, dsm_file):
    # get object from database
    viewshedjob = ViewShedJob.objects.get(uuid=viewshed_job_uuid)
    bb = None

    with tempfile.NamedTemporaryFile(suffix=".tif") as output_temp:
        raw_command = createRawGDALViewshedCommand(viewshedjob, dsm_file.name, output_temp.name, DEFAULT_PROJECTION)
        filtered_command = shlex.split(raw_command)
        subprocess.check_output(filtered_command, encoding="UTF-8")

        # Load Output Viewshed TIF File
        dst_crs = 'EPSG:4326'
        with rasterio.open(output_temp.name) as src:
            transform, width, height = calculate_default_transform(
                src.crs, dst_crs, src.width, src.height, *src.bounds)
            kwargs = src.meta.copy()
            kwargs.update({
                'crs': dst_crs,
                'transform': transform,
                'width': width,
                'height': height
            })

            # Create a transformed reprojection
            with tempfile.NamedTemporaryFile(suffix=".tif") as temp_transform:
                with rasterio.open(temp_transform.name, 'w', **kwargs) as dst:
                    for i in range(1, src.count + 1):
                        reproject(
                            source=rasterio.band(src, i),
                            destination=rasterio.band(dst, i),
                            src_transform=src.transform,
                            src_crs=src.crs,
                            dst_transform=transform,
                            dst_crs=dst_crs,
                            resampling=Resampling.nearest)
                    bb = dst.bounds
                temp_transform.seek(0)

                # convert reprojected file to PNG
                with tempfile.NamedTemporaryFile(suffix=".png") as raster_temp:
                    shutil.copy(
                        temp_transform.name,
                        raster_temp.name,
                        driver='PNG'
                    )
                    convertVieshedRGBA(raster_temp.name)
                    viewshedjob.write_object(raster_temp)
    return bb


def createRawGDALViewshedCommand(viewshedjob, dsm_filepath, output_filepath, dsm_projection):
    transformed_observer = viewshedjob.observer.transform(dsm_projection, clone=True)
    return f"""gdal_viewshed -b 1 -ov 1
        -oz {viewshedjob.observer_height} -tz {viewshedjob.target_height} -md {viewshedjob.radius}
        -ox {transformed_observer.x} -oy {transformed_observer.y} -om NORMAL
        {dsm_filepath} {output_filepath}
    """


@shared_task
def fullviewshedForAccessPoint(network_id, data, user_id):
    for resolution in DSMResolutionOptionsEnum:
        if resolution == DSMResolutionOptionsEnum.ULTRA:
            break
        renderViewshedForAccessPoint(network_id, data, user_id, resolution=resolution.value)


def renderViewshedForAccessPoint(network_id, data, user_id, resolution):
    ap = AccessPointLocation.objects.get(uuid=data['uuid'], owner=user_id)
    aoi = ap.getDSMExtentRequired()

    # Try and find an existing DSM conversion to save time, doesn't check user ownership
    dsm_jobs = DSMConversionJob.objects.filter(area_of_interest__contains=aoi, resolution=resolution).all()
    # There are no pre-existing dsm jobs that satisfy the requirement
    if not dsm_jobs:
        aoi = ap.createDSMJobEnvelope()
        dsm_job = DSMConversionJob(area_of_interest=aoi, resolution=resolution)
        dsm_job.save()
        exportDSMData(dsm_job.uuid)
    # There are dsm jobs that exist already, check if they are complete
    else:
        for dsm_job in dsm_jobs:
            if dsm_job.check_object():
                break
        if not dsm_job.check_object():
            exportDSMData(dsm_job.uuid)

    # Calculate how far viewshed should extend
    pt_radius = destination(ap.geojson, ap.max_radius, 90)
    src = ap.geojson.transform(DEFAULT_PROJECTION, clone=True)
    res = Point(pt_radius[0], pt_radius[1])
    res.srid = 4326
    res = res.transform(DEFAULT_PROJECTION, clone=True)
    radius = math.sqrt((src.x - res.x) * (src.x - res.x) + (src.y - res.y) * (src.y - res.y))

    viewshed_job = ViewShedJob(
        owner=User.objects.get(pk=user_id),
        observer=ap.geojson,
        observer_height=data['ap_hgt'],
        target_height=ap.default_cpe_height,
        radius=radius
    )

    viewshed_job.save()

    with tempfile.NamedTemporaryFile(mode='w+b', suffix="tif") as dsm_file:
        dsm_job.read_object(dsm_file)
        renderViewshed(viewshed_job_uuid=viewshed_job.uuid, dsm_file=dsm_file)

    channel_layer = get_channel_layer()
    channel_name = 'los_check_%s' % network_id

    aoi = ap.getDSMExtentRequired()
    coordinates = json.loads(aoi.envelope.json)
    coordinates = swapCoordinates(coordinates)
    resp = {
        'type': 'ap.viewshed',
        'url': viewshed_job.create_presigned_url(),
        'coordinates': coordinates,
    }
    async_to_sync(channel_layer.group_send)(channel_name, resp)


def swapCoordinates(polygon):
    coords = polygon['coordinates'][0]
    new_coords = [[coords[3], coords[2], coords[1], coords[0], coords[3]]]
    polygon['coordinates'] = new_coords
    return polygon


def convertVieshedRGBA(viewshed):
    im = Image.open(viewshed)
    img = np.asarray(im)
    numpy_image = np.zeros((im.size[1], im.size[0], 4), np.uint8)
    numpy_image[img == 0] = [0, 0, 0, 255]

    rgbaimg = Image.fromarray(numpy_image.astype('uint8'), 'RGBA')
    rgbaimg.save(viewshed)
