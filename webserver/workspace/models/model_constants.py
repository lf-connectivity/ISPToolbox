import enum


class FeatureType(enum.Enum):
    AP = 'access_point'
    CPE = 'cpe'
    PTP_LINK = 'ptp_link'
    AP_CPE_LINK = 'ap_cpe_link'
    COVERAGE_AREA = 'coverage_area'


# Number of feet in a meter
M_2_FT = 3.28084
