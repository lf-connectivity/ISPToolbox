# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.test import TestCase
from IspToolboxApp.models.MarketingModels import MarketingAccount, MarketingAudience
from django.contrib.gis.geos import GEOSGeometry


class TestMarketingModels(TestCase):
    def test_models_simple(self):
        new_account = MarketingAccount(fbid=0)
        new_account.save()

        geojson = """{
    "type":"Polygon",
    "coordinates":
    [
        [
            [-121.31489753723145,38.02077915927757],
            [-121.35111808776855,38.004819966413194],
            [-121.35446548461914,37.97634176237577],
            [-121.30528450012206,37.96125262956143],
            [-121.2846851348877,37.98256597180672],
            [-121.31489753723145,38.02077915927757]
        ]
    ]
}"""
        targeting_audience = MarketingAudience(
            include_geojson=GEOSGeometry(geojson), account=new_account)
        targeting_audience.save()
        self.assertTrue(
            targeting_audience.checkUserInside(-121.31970405578612, 38.00035618059361)
        )
        self.assertFalse(
            targeting_audience.checkUserInside(-121.28528594970703, 38.001708871657996)
        )
        exclude_geojson = """{
    "type":"Polygon",
    "coordinates":
    [
        [
            [-121.32322311401369,38.001776505556215],
            [-121.32167816162108,37.998259460133404],
            [-121.31747245788574,37.99866528167505],
            [-121.3161849975586,38.00279100654415],
            [-121.32322311401369,38.001776505556215]
          ]
    ]
}"""
        targeting_audience.exclude_geojson = GEOSGeometry(exclude_geojson)
        targeting_audience.save()
        self.assertFalse(
            targeting_audience.checkUserInside(-121.31970405578612, 38.00035618059361)
        )
        audience2 = MarketingAudience(
            include_geojson=GEOSGeometry(exclude_geojson),
            account=new_account)
        audience2.save()

        new_account.refresh_from_db()
        self.assertEqual(len(new_account.marketingaudience_set.all()), 2)
