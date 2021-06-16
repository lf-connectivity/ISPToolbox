from django.utils.translation import gettext as _

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
        'link': _('https://support.measurementlab.net/help/en-us/10-data/26-how-does-m-lab-identify-the-locations-of-tests-how-precise-is-the-location-information'),  # noqa
        'linkDesc':  _('See Data Source'),
    }
}
