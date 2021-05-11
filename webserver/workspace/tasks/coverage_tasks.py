from workspace.models import (
    AccessPointLocation, AccessPointCoverageBuildings, BuildingCoverage,
)
from gis_data.models import MsftBuildingOutlines
import tempfile
import rasterio
from rasterio import mask
from shapely import wkt

VISIBLE_PIXEL_VALUE = 255


def calculateCoverage(access_point_id: str, user_id: str) -> None:
    """
    for an access point location calculate all the reachable buildings given a viewshed
    """
    access_point = AccessPointLocation.objects.get(uuid=access_point_id, owner=user_id)
    viewshed = access_point.viewshedmodel
    # Load Up Coverage
    with tempfile.NamedTemporaryFile(suffix=".tif") as fp:
        viewshed.read_object(fp, tif=True)
        with rasterio.open(fp.name) as ds:
            # Get Building Coverage
            coverage = AccessPointCoverageBuildings.objects.filter(
                ap=access_point
            ).order_by('created').first()
            # Check Building Coverage
            for building in coverage.nearby_buildings.all():
                # Determine if Any areas are not obstructed
                building_polygon = (
                    building.geog if building.geog else
                    MsftBuildingOutlines.objects.get(id=building.msftid).geog
                )
                building_polygon = wkt.loads(building_polygon.wkt)
                if building_polygon:
                    out_image, out_transform = mask.mask(
                        ds, [building_polygon], crop=True
                    )
                    serviceable = (out_image == VISIBLE_PIXEL_VALUE).any()
                    if serviceable:
                        building.status = BuildingCoverage.CoverageStatus.SERVICEABLE
                        building.save(update_fields=['status'])
                    else:
                        building.status = BuildingCoverage.CoverageStatus.UNSERVICEABLE
                        building.save(update_fields=['status'])
