from workspace.models import (
    AccessPointLocation, AccessPointCoverageBuildings, BuildingCoverage,
    Viewshed
)
from gis_data.models import MsftBuildingOutlines
import tempfile
import rasterio
from rasterio import mask
from shapely import wkt
from django.contrib.gis.geos import Point
import numpy as np

VISIBLE_PIXEL_VALUE = 255


def calculateCoverage(access_point_id: str, user_id: str) -> None:
    """
    for an access point location calculate all the reachable buildings given a viewshed
    """
    access_point = AccessPointLocation.objects.get(uuid=access_point_id, owner=user_id)
    viewshed = access_point.viewshed
    # Load Up Coverage
    with tempfile.NamedTemporaryFile(suffix=".tif") as fp:
        viewshed.read_object(fp, tif=True)
        with rasterio.open(fp.name) as ds:
            # Get Building Coverage
            coverage = AccessPointCoverageBuildings.objects.filter(
                ap=access_point
            ).order_by('created').first()
            # Check Building Coverage
            for building in coverage.buildingcoverage_set.all():
                # Determine if Any areas are not obstructed
                building_polygon = (
                    building.geog if building.geog else
                    MsftBuildingOutlines.objects.get(id=building.msftid).geog
                )
                building_polygon = wkt.loads(building_polygon.wkt)
                if building_polygon:
                    nodata = None
                    if viewshed.mode == Viewshed.CoverageStatus.GROUND:
                        nodata = np.Inf
                    out_image, out_transform = mask.mask(
                        ds, [building_polygon], nodata=nodata, crop=True
                    )
                    # Find the highest point in the cropped image and make that the recommended
                    # installation location for the CPE
                    cpe_location = np.argmax(out_image)
                    if viewshed.mode == Viewshed.CoverageStatus.GROUND:
                        cpe_location = np.argmin(out_image)
                    _, max_index_i, max_index_j = np.unravel_index(cpe_location, out_image.shape)
                    # Update Serviceability and Best CPE location
                    if viewshed.mode == Viewshed.CoverageStatus.GROUND:
                        serviceable = (np.logical_and(out_image < access_point.default_cpe_height, out_image != np.Inf)).any()
                    if viewshed.mode == Viewshed.CoverageStatus.NORMAL:
                        serviceable = (out_image == VISIBLE_PIXEL_VALUE).any()
                    if serviceable:
                        building.status = BuildingCoverage.CoverageStatus.SERVICEABLE
                    else:
                        building.status = BuildingCoverage.CoverageStatus.UNSERVICEABLE
                    if serviceable:
                        loc = rasterio.transform.xy(out_transform, max_index_i, max_index_j)
                        building.cpe_location = Point(*loc)
                    building.save(update_fields=['status', 'cpe_location'])
