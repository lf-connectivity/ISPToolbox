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

from IspToolboxApp.Views.market_evaluator_views.MarketEvaluator import BuildingsView, \
    IncomeView, Form477View, ServiceProviders, CountBuildingsView, RDOFView, DataAvailableView
from IspToolboxApp.Views.MarketEvaluatorView import MarketEvaluatorPipelineBroadbandNow, \
    MarketEvaluatorPipelineServiceProviders, MarketEvaluatorPipelineIncome, \
    MarketEvaluatorPipelineKMZ, MarketEvaluatorPipelineView, MarketEvaluatorPipelineBuildings, \
    MarketEvaluatorExport, MarketEvaluatorExportNoPipeline
from IspToolboxApp.Views.RetargetingPixelView import MarketingAccountView, \
    MarketingAudienceView, MarketingAudienceGeoPixelCheck
from IspToolboxApp.Views.MarketingViews import MarketingConvertPolygons
from IspToolboxApp.Views.mmWavePlannerViews import MMWavePlannerView, MMWaveHelpCenterView
from IspToolboxApp.Views.market_evaluator_views.GrantViews import SelectCensusGroupView
from IspToolboxApp.Views.market_evaluator_views.GeographicViews import SelectZipView, SelectCountyView
from IspToolboxApp.Views.MLabSpeedView import MLabSpeedView
from IspToolboxApp.Views.redirect_view import HomepageRedirect
from Overlay.views import OverlaySource
from dataUpdate.views import CountrySourceUpdatedView
from mmwave.views import LOSCheckDemo

from rest_framework import routers
from django.conf.urls.static import static
from django.conf import settings

# REST API Router
router = routers.DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    # Health Check Endpoint
    path('elb-status/', views.HealthCheckView.as_view()),
    # Async Jobs
    path('gis/aoi/', views.index),
    path('gis/task/<str:task_id>/', views.TaskView.as_view(), name='task'),
    path('gis/progress/<str:task_id>/', views.ProgressView.as_view(), name='progress'),
    path('gis/result/<str:task_id>/', views.ResultView.as_view(), name='result'),
    path('gis/osmBuildings/', BuildingsView.as_view(), name='osmBuildings'),
    # Market Evaluator
    path('market-evaluator/grants/', SelectCensusGroupView.as_view(), name='select_cbg'),
    path('market-evaluator/zip-geo/', SelectZipView.as_view(), name='select_zip'),
    path('market-evaluator/county-geo/', SelectCountyView.as_view(), name='select_county'),
    path('market-evaluator/market-income/', IncomeView.as_view(), name='PRIncome'),
    path('market-evaluator/market-competition/',  Form477View.as_view(), name='PRIncome'),
    path('market-evaluator/market-providers/', ServiceProviders.as_view(), name='Providers'),
    path('market-evaluator/market-count/', CountBuildingsView.as_view(), name='PRIncome'),
    path('market-evaluator/market-size/', BuildingsView.as_view(), name='BuildingOutlines'),
    path('market-evaluator/market-rdof/', RDOFView.as_view(), name='PRIncome'),
    path('market-evaluator/market-data-available/',  DataAvailableView.as_view(), name='PRIncome'),
    # Pipeline Functions for MarketEvaluator
    path('market-evaluator/', MarketEvaluatorPipelineView.as_view(), name='marketEvalAsync'),
    path('market-evaluator/kmz/', MarketEvaluatorPipelineKMZ.as_view(), name='marketEvalKMZAsync'),
    path('market-evaluator/buildings/', MarketEvaluatorPipelineBuildings.as_view(), name='marketEvalAsyncBuildings'),
    path('market-evaluator/income/', MarketEvaluatorPipelineIncome.as_view(), name='marketEvalAsyncIncome'),
    path(
        'market-evaluator/service-providers/',
        MarketEvaluatorPipelineServiceProviders.as_view(),
        name='marketEvalAsyncServiceProviders'
    ),
    path('market-evaluator/speeds/', MLabSpeedView.as_view()),
    path('market-evaluator/broadbandnow/', MarketEvaluatorPipelineBroadbandNow.as_view(), name='bbnow'),
    path('market-evaluator/export/', MarketEvaluatorExport.as_view(), name='export'),
    path('market-evaluator/export-np/', MarketEvaluatorExportNoPipeline.as_view(), name='exportnp'),
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
    # Sources Last Updated Dates
    path('sources/last-update/', CountrySourceUpdatedView.as_view(), name='source_updated_dates'),
    # REST API Endpoints
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(router.urls)),
    # Workspace
    path('pro/', include('workspace.urls')),
    # Demo Views
    path('demo/los-check/', LOSCheckDemo.as_view(), name='demo-los-check'),
    # CMS
    path('', HomepageRedirect.as_view()),
] + \
    static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + \
    static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
