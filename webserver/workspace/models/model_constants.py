import enum


class FeatureType(enum.Enum):
    AP = 'access_point'
    CPE = 'cpe'
    PTP_LINK = 'ptp_link'
    AP_CPE_LINK = 'ap_cpe_link'
    POLYGON_COVERAGE_AREA = 'polygon_coverage_area'
    MULTIPOLYGON_COVERAGE_AREA = 'multipolygon_coverage_area'
    AP_COVERAGE_AREA = 'ap_coverage_area'
