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
from django.contrib.admin.views.decorators import staff_member_required

from IspToolboxApp import views

from IspToolboxApp.Views.market_evaluator_views.MarketEvaluator import BuildingsView, \
    IncomeView, Form477View, ServiceProviders, CountBuildingsView, RDOFView, DataAvailableView
from IspToolboxApp.Views.MarketEvaluatorView import MarketEvaluatorPipelineBroadbandNow, \
    MarketEvaluatorPipelineServiceProviders, MarketEvaluatorPipelineIncome, \
    MarketEvaluatorPipelineKMZ, MarketEvaluatorPipelineView, MarketEvaluatorPipelineBuildings
from IspToolboxApp.Views.RetargetingPixelView import MarketingAccountView, \
    MarketingAudienceView, MarketingAudienceGeoPixelCheck
from IspToolboxApp.Views.MarketingViews import MarketingConvertPolygons
from IspToolboxApp.Views.mmWavePlannerViews import MMWavePlannerView, MMWaveHelpCenterView
from IspToolboxApp.Views.market_evaluator_views.GrantViews import SelectCensusGroupView, SelectZipView
from IspToolboxApp.Views.MLabSpeedView import MLabSpeedView

from rest_framework import routers
from django.conf.urls.static import static
from django.conf import settings

from mmwave.views import TGLinkView, LinkGISDataView, UpdateLidarBoundariesView

# Wagtails CMS
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.core import urls as wagtail_urls
from wagtail.documents import urls as wagtaildocs_urls

# REST API Router
router = routers.DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    # Health Check Endpoint
    path('elb-status/', views.HealthCheckView.as_view()),
    path('', views.HealthCheckView.as_view(), name='healthcheck'),
    path('login/', views.SocialLoginView.as_view(), name='login'),
    path(r'accounts/', include('allauth.urls')),
    # Async Jobs
    path('gis/aoi/', views.index),
    path('gis/task/<str:task_id>/', views.TaskView.as_view(), name='task'),
    path('gis/progress/<str:task_id>/', views.ProgressView.as_view(), name='progress'),
    path('gis/result/<str:task_id>/', views.ResultView.as_view(), name='result'),
    path('gis/osmBuildings/', BuildingsView.as_view(), name='osmBuildings'),
    # Market Evaluator
    path('market-evaluator/grants/', SelectCensusGroupView.as_view(), name='select_cbg'),
    path('market-evaluator/zip-geo/', SelectZipView.as_view(), name='select_zip'),
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
    # GeoTargeting Views
    path('marketing/audience/', MarketingAudienceView.as_view(), name="marketing_audience"),
    path('marketing/account/', MarketingAccountView.as_view(), name="marketing_account"),
    path('marketing/geocheck/', MarketingAudienceGeoPixelCheck.as_view(), name="marketing_geocheck"),
    # Marketing Pin Conversion Endpoints
    path('marketing/convert/', MarketingConvertPolygons.as_view()),
    # Path mmWave Planner
    path('mmwave-planner/', MMWavePlannerView.as_view(), name='mmwaveplanner'),
    path('help-center/', MMWaveHelpCenterView.as_view(), name='mmwaveplanner-helpcenter'),
    # Path TG Planning
    path('mmwave/add-boundary/', staff_member_required(UpdateLidarBoundariesView.as_view())),
    path('mmwave/link-check/', TGLinkView.as_view()),
    path('mmwave/link-check/gis/', LinkGISDataView.as_view()),
    # REST API Endpoints
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(router.urls)),
    # CMS
    path('cms/', include(wagtailadmin_urls)),
    path('documents/', include(wagtaildocs_urls)),
    path('pages/', include(wagtail_urls)),
] + \
    static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + \
    static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
