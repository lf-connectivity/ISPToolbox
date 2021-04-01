import enum

class FeatureType(enum.Enum):
    AP = 'access_point'
    CPE = 'cpe'
    PTP_LINK = 'ptp_link'
    AP_CPE_LINK = 'ap_cpe_link'

class CoverageCalculationStatus(enum.Enum):   # A subclass of Enum
    START = 'Started'
    FAIL = 'Failed'
    COMPLETE = 'Complete'


class CoverageStatus(enum.Enum):
    SERVICEABLE = 'serviceable'
    UNSERVICEABLE = 'unserviceable'
    UNKNOWN = 'unknown'