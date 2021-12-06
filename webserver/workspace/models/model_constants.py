import enum
import typing

from dataclasses import dataclass, field


class FeatureType(enum.Enum):
    AP = "access_point"
    CPE = "cpe"
    PTP_LINK = "ptp_link"
    AP_CPE_LINK = "ap_cpe_link"
    COVERAGE_AREA = "coverage_area"
    AP_SECTOR = "sector"


@dataclass
class _Limits(object):
    min: float
    max: float
    default: float

    # There might be other defaults defined. Use this to make it easier to look
    # them up
    other_defaults: typing.Dict[str, float] = field(default_factory=dict)

    # lookup <attr>_default
    def __getattr__(self, attr):
        if attr in self.other_defaults:
            return self.other_defaults[attr]
        else:
            raise AttributeError(
                f"type object {repr(self.__class__.__name__)} has no attribute {repr(attr)}"
            )


class ModelLimits(object):
    # Height in meters
    HEIGHT = _Limits(0.1, 1000, 30, {"cpe_default": 1, "ptp_default": 18.29})

    # Radius in km
    RADIUS = _Limits(0.1, 16, 2, {"no_check_radius_default": 0.01})

    # Frequency in GHz
    FREQUENCY = _Limits(0, 100, 2.437)

    # Heading in degrees
    HEADING = _Limits(0, 360, 0)

    # Azimuth in degrees
    AZIMUTH = _Limits(0.1, 360, 120)


# Number of feet in a meter
M_2_FT = 3.28084

KM_2_MI = 0.621371
