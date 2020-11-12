from django.test import TestCase
from .util import squaredMetersToMiles
import sys
import math

sampleAreaMeters = 684291.294401
sampleAreaMiles = 0.2642063458400304
floatEps = sys.float_info.epsilon


class UtilTests(TestCase):
    def test_sqmeter_to_sqmile(self):
        ans = squaredMetersToMiles(sampleAreaMeters)
        self.assertTrue(math.isclose(ans, sampleAreaMiles, abs_tol=floatEps))
