# Sources should be in the format
# {
#     'link': <URL>,
#     'description': <string>,
#     'updated': <optional string>
# }

from dataclasses import dataclass

from dataUpdate.models import Source

import datetime


@dataclass
class ISPToolboxSource(object):
    link: str
    title: str
    last_updated: datetime.date = None


# TODO: Migrate this shit into database. Make a migration for sources, then add this
# in via admin page.
_ISP_TOOLBOX_US_SOURCES = {
    'BUILDINGS': ISPToolboxSource(
        link='https://github.com/Microsoft/USBuildingFootprints',
        title='Microsoft US Building Footprints, July 2018',
        last_updated=datetime.date(2020, 6, 1)
    ),
    'SERVICE_PROVIDERS': ISPToolboxSource(
        link='https://www.fcc.gov/general/broadband-deployment-data-fcc-form-477',
        title='Federal Communications Commission (FCC): Form 477 June 2020',
        last_updated=datetime.date(2020, 6, 1)
    ),
    'INCOME': ISPToolboxSource(
        link='https://www.census.gov/programs-surveys/acs',
        title='US Census Bureau: American Community Survey 2019',
        last_updated=datetime.date(2021, 2, 1)
    ),
    'RDOF': ISPToolboxSource(
        link='https://www.fcc.gov/auction/904',
        title='FCC Auction 904',
        last_updated=datetime.date(2020, 10, 1)
    ),
    'BROADBAND_PRICING': ISPToolboxSource(
        link='https://www.broadbandnow.com/',
        title='BroadbandNow',
        last_updated=datetime.date(2021, 4, 1)
    ),
    'MLAB_NDT': ISPToolboxSource(
        link='https://www.measurementlab.net/tests/ndt',  # noqa: E501
        title='https://www.measurementlab.net/tests/ndt',
        last_updated=datetime.date(2021, 7, 1)
    ),
    'POPULATION': ISPToolboxSource(
        link='https://data.humdata.org/dataset/united-states-high-resolution-population-density-maps-demographic-estimates',
        title='High Resolution Settlement Layer (HRSL)',
        last_updated=datetime.date(2021, 8, 8)
    ),
    'PR_BUILDINGS': ISPToolboxSource(
        link='https://www.openstreetmap.org/copyright',
        title='\u00A9 OpenStreetMap contributors',
    ),
    'ASR': ISPToolboxSource(
        link='https://www.fcc.gov/uls/transactions/daily-weekly',
        title='FCC ULS & ASR Weekly Public Access Files',
        last_updated=datetime.date(2020, 10, 1)
    ),
    'RURAL': ISPToolboxSource(
        link='https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
        title='US Census Bureau\'s UA10 "Urban Areas" dataset, 2019',
        last_updated=datetime.date(2020, 11, 1)
    ),
    'CBRS': ISPToolboxSource(
        link='https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license',
        title='FCC Auction 105',
        last_updated=datetime.date(2021, 6, 1)
    ),
    'AP_LOS': ISPToolboxSource(
        link='https://cloudrf.com/api/',
        title='Cloud-RF'
    ),
    'CENSUS_BLOCKS': ISPToolboxSource(
        link='https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html',
        title='Census Tiger/Line\u00AE Shapefiles',
        last_updated=datetime.date(2021, 5, 1)
    ),
    'TRIBAL': ISPToolboxSource(
        link='https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2020&layergroup=American+Indian+Area+Geography',
        title='Census Tiger/Line\u00AE Shapefiles',
        last_updated=datetime.date(2021, 6, 1)
    ),
    'USGS_3DEP': ISPToolboxSource(
        link='https://www.usgs.gov/core-science-systems/ngp/3dep',
        title='USGS 3DEP LiDAR Data',
    ),
    'USGS_3DEP_POINT_CLOUDS': ISPToolboxSource(
        link='https://registry.opendata.aws/usgs-lidar/',
        title='USGS 3DEP LiDAR Point Clouds AWS Public Dataset',
    ),
    'CLOUD_RF': ISPToolboxSource(
        link='https://cloudrf.com/api/',
        title='Cloud-RF',
        last_updated=datetime.date(2003, 1, 1)
    ),
    'MAPBOX': ISPToolboxSource(
        link='https://www.mapbox.com/about/maps',
        title='Mapbox'
    )
}


_ISP_TOOLBOX_LICENSES = {
    'ODBL': ISPToolboxSource(
        link='https://opendatacommons.org/licenses/odbl/',
        title='Open Data Commons Open Database License (ODbL)'
    )
}


_ISP_TOOLBOX_SOURCES = {
    'US': _ISP_TOOLBOX_US_SOURCES,
    'LICENSES': _ISP_TOOLBOX_LICENSES
}


def get_source(country, source_id):
    if country not in _ISP_TOOLBOX_SOURCES:
        raise ValueError(f'No sources for {country} exist.')
    if source_id not in _ISP_TOOLBOX_SOURCES[country]:
        raise ValueError(f'No source with id {source_id} in country {country}')

    source = _ISP_TOOLBOX_SOURCES[country][source_id]

    # Update last_updated with recent information, if any.
    if Source.objects.filter(source_country=country, source_id=source_id).exists():
        db_source = Source.objects.get(
            source_country=country, source_id=source_id)
        source.last_updated = db_source.last_updated

    return source


# TODO: Support Canada!!!

# ISP_TOOLBOX_SOURCES = {
#   CA: {
#     LINKS: {
#       BUILDINGS: 'https://github.com/microsoft/CanadianBuildingFootprints',
#       SERVICE_PROVIDERS:
#         'https://open.canada.ca/data/en/dataset/00a331db-121b-445d-b119-35dbbe3eedd9',
#       INCOME:
#         'https://www12.statcan.gc.ca/census-recensement/2016/dp-pd/dt-td/index-eng.cfm',
#       MLAB:
#         'https://support.measurementlab.net/help/en-us/10-data/26-how-does-m-lab-identify-the-locations-of-tests-how-precise-is-the-location-information',
#     },
#     DESCRIPTIONS: {
#       BUILDINGS: 'Microsoft CA Building Footprints, June 2019',
#       SERVICE_PROVIDERS: 'Canada National Broadband Data, September 2016',
#       INCOME: '2016 Canada Census, February 2017',
#       MLAB: 'M-Lab.',
#     },
#     // Defaults for last updated dates, server calls may update these.
#     UPDATED: {
#       BUILDINGS: '',
#       SERVICE_PROVIDERS: '',
#       INCOME: '',
#       MLAB: '[Last Updated Oct 2020]',
#     },
#   },
# }
