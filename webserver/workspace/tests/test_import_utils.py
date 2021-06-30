import django.test

from workspace.models import (
    AccessPointLocation, CPELocation, APToCPELink    # noqa: F401
)
from workspace.views import (
    MarketEvaluatorView, PolygonCoverageAreaCreate   # noqa: F401
)
from workspace.utils.import_utils import get_imported_classnames


class ImportUtilsTestCase(django.test.TestCase):
    def testGetAllImports(self):
        imported_classes = get_imported_classnames(__name__)
        expected_imports = ['AccessPointLocation', 'APToCPELink', 'CPELocation',
            'MarketEvaluatorView', 'PolygonCoverageAreaCreate']
        self.assertEqual(sorted(imported_classes), sorted(expected_imports))
