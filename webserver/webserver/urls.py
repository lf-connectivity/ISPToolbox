"""webserver URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin

from django.urls import path, include

from IspToolboxApp import views

from IspToolboxApp.views.market_evaluator_views.MarketEvaluator import BuildingsView
from IspToolboxApp.views.MarketEvaluatorView import (
    MarketEvaluatorPipelineKMZ,
    MarketEvaluatorExport, MarketEvaluatorExportNoPipeline)
from IspToolboxApp.views.RetargetingPixelView import MarketingAccountView, \
    MarketingAudienceView, MarketingAudienceGeoPixelCheck
from IspToolboxApp.views.MarketingViews import MarketingConvertPolygons
from IspToolboxApp.views.mmWavePlannerViews import MMWavePlannerView, MMWaveHelpCenterView
from IspToolboxApp.views.redirect_view import HomepageRedirect
from Overlay.views import OverlaySource
from dataUpdate.views import CountrySourceUpdatedView, ASNElasticSearchView
from mmwave.views import LOSCheckDemo, DSMExportView
from IspToolboxAccounts.views import IntegrationTestAccountCreationView

from rest_framework import routers
from django.conf.urls.static import static
from django.conf import settings
from django.conf.urls import (
    handler404, handler500
)

# REST API Router
router = routers.DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    # Health Check Endpoint
    path('elb-status/', views.HealthCheckView.as_view()),
    path('gis/osmBuildings/', BuildingsView.as_view(), name='osmBuildings'),
    # Market Evaluator
    # Pipeline Functions for MarketEvaluator
    path('market-evaluator/kmz/', MarketEvaluatorPipelineKMZ.as_view(), name='marketEvalKMZAsync'),  # ajax request from fb
    path('market-evaluator/export/', MarketEvaluatorExport.as_view(), name='export'),
    path('market-evaluator/export-np/', MarketEvaluatorExportNoPipeline.as_view(), name='exportnp'),  # ajax request from fb
    path('market-evaluator/test/', views.MarketEvaluatorTest.as_view(), name='market-eval-test'),
    # GeoTargeting Views
    path('marketing/audience/', MarketingAudienceView.as_view(), name="marketing_audience"),
    path('marketing/account/', MarketingAccountView.as_view(), name="marketing_account"),
    path('marketing/geocheck/', MarketingAudienceGeoPixelCheck.as_view(), name="marketing_geocheck"),
    # Marketing Pin Conversion Endpoints
    path('marketing/convert/', MarketingConvertPolygons.as_view()),
    # Path mmWave Planner
    path('mmwave-planner/', MMWavePlannerView.as_view(), name='mmwaveplanner'),
    path('help-center/', MMWaveHelpCenterView.as_view(), name='mmwaveplanner-helpcenter'),
    # Path Overlay
    path('overlay/', OverlaySource.as_view(), name='overlay_source'),
    path('asn/', ASNElasticSearchView.as_view(), name="asn-search"),
    # Sources Last Updated Dates
    path('sources/last-update/', CountrySourceUpdatedView.as_view(), name='source_updated_dates'),
    # REST API Endpoints
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(router.urls)),
    # Workspace
    path('pro/', include('workspace.urls')),
    # Demo Views
    path('demo/los-check/', LOSCheckDemo.as_view(), name='demo-los-check'),
    path('demo/dsm-app/', DSMExportView.as_view(), name="demo-dsm-app"),
    # Redirect
    path('', HomepageRedirect.as_view()),
    # TODO achong: only include allauth urls we need
    # Facebook SDK Login
    path('accounts/', include('allauth.urls')),
    # Integration Test Endpoints - be sure to 404 in prod
    path('test/accounts/', IntegrationTestAccountCreationView.as_view(), name="test-accounts"),
] + \
    static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + \
    static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


handler500 = 'workspace.views.Error500View'  # noqa
handler404 = 'workspace.views.Error404View'  # noqa
handler403 = 'workspace.views.Error403View'  # noqa