import enum
import typing

from dataclasses import dataclass, field


# Number of feet in a meter
M_2_FT = 3.28084

KM_2_MI = 0.621371

SPEED_OF_LIGHT = 299792458

EARTH_RADIUS_KM = 6371
EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000

FREQUENCY_CHOICES = [
    (2.437, "2.4 GHz"),
    (3.6, "3.65 GHz"),
    (5.4925, "5 GHz"),
    (11.2, "11 GHz"),
    (18.7, "18 GHz"),
    (24.35, "24 GHz"),
    (64.79, "60 GHz"),
]


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
    default: float = 0

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

    # Return a version of this object with scaled factors
    def get_scaled_limits(self, scale_factor):
        return _Limits(
            scale_factor * self.min,
            scale_factor * self.max,
            scale_factor * self.default,
        )


class ModelLimits(object):
    # Height in meters
    HEIGHT = _Limits(0.1, 1000, 30, {"cpe_default": 1, "ptp_default": 18.29})

    # Height in ft
    HEIGHT_FT = HEIGHT.get_scaled_limits(M_2_FT)

    # Radius in km
    RADIUS = _Limits(0.1, 16, 2, {"no_check_radius_default": 0.01})

    # Radius in mi
    RADIUS_MILES = RADIUS.get_scaled_limits(KM_2_MI)

    # Frequency in GHz
    FREQUENCY = _Limits(0, 100, 2.437)

    # Heading in degrees
    HEADING = _Limits(0, 360, 0)

    # Azimuth in degrees
    AZIMUTH = _Limits(0.01, 360, 120)

    # Name length
    NAME = _Limits(1, 50)
