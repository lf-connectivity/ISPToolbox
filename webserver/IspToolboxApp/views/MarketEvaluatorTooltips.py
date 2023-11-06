# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.utils.translation import gettext as _

# flake8: noqa

TOOLTIPS = {
    'buildings': {
        'title': _('Buildings inside Coverage Area'),
        'body': _("""
        This is a count of rooftops identified in your selected area;
        rooftops may include homes, businesses, unoccupied structures, etc."""),
        'link': 'https://github.com/Microsoft/USBuildingFootprints',
        'linkDesc': _('See Data Source'),
    },
    'market_pen': {
        'title': _('Potential Market Penetration'),
        'body': _("""This number represents the percentage of buildings
        (i.e. rooftops) that you forecast may subscribe to your service.
        You can change the percentage based on your determined estimated market
        penetration and existing market conditions."""),
        'link': _(''),
        'linkDesc': _(''),
    },
    'leads': {
        'title': _('Potential Leads'),
        'body': _("""
        This number represents the number buildings you could potentially
        service based on our evaluator. This is calculated by multiplying
        the number of Buildings Inside Coverage Area by the Market Penetration
        percentage."""),
        'link': _(''),
        'linkDesc': _(''),
    },
    'density': {
        'title': _('Building Density'),
        'body': _("""The number of buildings in your selected area as buildings
        per mile squared."""),
        'link': '',
        'linkDesc': '',
    },
    'population': {
        'title': _('Population'),
        'body': _("""Estimated population of selected area. Based on satellite imagery and census data."""),
        'link': 'https://data.humdata.org/dataset/united-states-high-resolution-population-density-maps-demographic-estimates',
        'linkDesc': 'See Data Source',
    },
    'providers': {
        'title': _('Service Providers'),
        'body': _("""This is the number of Service Providers in the selected
        coverage area. Service Providers are listed in the order of their
        advertised speeds if available."""),
        'link': 'https://www.fcc.gov/general/broadband-deployment-data-fcc-form-477',
        'linkDesc':  _('See Data Source'),
    },
    'income': {
        'title': _('Avg. Household Income'),
        'body': _("""The average household income in the selected area,
        weighted by the total of buildings. Data does not reflect the
        income of individual households."""),
        'link': 'https://www.census.gov/programs-surveys/acs',
        'linkDesc':  _('See Data Source'),
    },
    'speeds': {
        'title': _('Median Speeds'),
        'body': _("""The data presented is download/upload Mbps.
        Speed test results are a weighted average over zipcode medians
        if multiple zip/postal codes are selected."""),
        'link': 'https://support.measurementlab.net/help/en-us/10-data/26-how-does-m-lab-identify-the-locations-of-tests-how-precise-is-the-location-information',
        'linkDesc':  _('See Data Source'),
    },
    'asr': {
        'title': _('ASR Tower Locations'),
        'body': _("""This overlay displays where towers and antenna structures
        can be found.
        """),
        'link': 'https://www.fcc.gov/uls/transactions/daily-weekly',
        'linkDesc': _('See Data Source')
    },
    'rdof': {
        'title': _('FCC Rural Digital Opportunity Fund (Closed)'),
        'body': _("""The FCC has identified the highlighted areas 
        that are preliminarily determined to be eligible for the Rural 
        Digital Opportunity Fund Phase III auction (Auction 904).
        """),
        'link': 'https://www.fcc.gov/auction/904',
        'linkDesc':  _('See Data Source'),
    },
    'census_blocks': {
        'title': _('Census Blocks'),
        'body': _("""This overlay outlines census blocks. These geographic 
        areas are statistical areas bounded by visible features, such as 
        streets, roads, streams, and railroad tracks, and by non visible 
        boundaries, such as selected property lines and city, township, 
        school district, and county limits and short line-of-sight 
        extensions of streets and roads. See the data source to learn more.
        """),
        'link': 'https://www.census.gov/programs-surveys/geography/about/glossary.html#par_textimage_5',
        'linkDesc':  _('See Data Source'),
    },
    'non_urban': {
        'title': _('Non-urban < 10/1 Mbps'),
        'body': _("""Zipcode areas not including 'Urban Areas' or 'Urban Clusters' as defined by the
         US Census Bureau with median speed measured at less than 10/1 Mbps (Download/Upload) provided by M-Lab.
        """),
        'link': 'https://support.measurementlab.net/help/en-us/10-data/26-how-does-m-lab-identify-the-locations-of-tests-how-precise-is-the-location-information',
        'linkDesc':  _('See M-Lab Source'),
        'link2': 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
        'link2Desc':  _('See Census Source'),
    },
    'cbrs': {
        'title': _('CBRS PAL Holders'),
        'body': _("""US Census counties and companies that hold CBRS Priority Access Licenses from FCC Auction 105
        """),
        'link': 'https://auctiondata.fcc.gov/public/projects/auction105/reports/results_by_license',
        'linkDesc':  _('See Data Source'),
    },
    'tribal': {
        'title': _('Tribal Lands'),
        'body': _("""The Census Bureau conducts the Boundary and Annexation Survey (BAS) yearly to update and maintain
         information about legal boundaries, names and official status of federally recognized American Indian reservations
         and/or off-reservation trust lands, as well as counties, incorporated places and minor civil divisions."""),
        'link': 'https://www.census.gov/cgi-bin/geo/shapefiles/index.php?year=2020&layergroup=American+Indian+Area+Geography',
        'linkDesc': _('See Data Source'),
    },
    'filter': {
        'title': _('Filter by Rooftop Size'),
        'body': _("""Exclude buildings inside the coverage area whose rooftops are outside of the selected range"""),
        'link': 'https://github.com/Microsoft/USBuildingFootprints',
        'linkDesc': _('See Data Source'),
    }
}
