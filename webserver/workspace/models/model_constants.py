import enum


class FeatureType(enum.Enum):
    AP = 'access_point'
    CPE = 'cpe'
    PTP_LINK = 'ptp_link'
    AP_CPE_LINK = 'ap_cpe_link'
