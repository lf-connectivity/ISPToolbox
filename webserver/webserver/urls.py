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
from django.conf.urls import (
    handler404, handler500, url
)
from django.conf import settings
from django.conf.urls.static import static
from django.urls.base import reverse_lazy
from django.views.generic.base import RedirectView
from rest_framework import routers
from solar_sizing_tool.views import SolarSizingToolView
from mmwave.views import (
    LOSCheckDemo, DSMExportView, LatestLidarView, NetworkDemoView
)
from dataUpdate.views import CountrySourceUpdatedView, ASNElasticSearchView
from Overlay.views import OverlaySource
from IspToolboxAccounts.views import IntegrationTestAccountCreationView, UpdateNuxSettingView

from django.contrib import admin
from django.contrib.auth import views as auth_views

from django.urls import path, include, re_path

from IspToolboxApp import views
from django.views.decorators.cache import cache_page
from django_js_reverse import views as reverse_views


# REST API Router
router = routers.DefaultRouter()

urlpatterns = [
    path('admin/doc/', include('django.contrib.admindocs.urls')),
    path('admin/', admin.site.urls),
    # Health Check Endpoint
    path('elb-status/', views.HealthCheckView.as_view()),
    path('gis/osmBuildings/', views.BuildingsView.as_view(), name='osmBuildings'),
    # Market Evaluator
    # Pipeline Functions for MarketEvaluator
    path('market-evaluator/kmz/', views.MarketEvaluatorPipelineKMZ.as_view(),
         name='marketEvalKMZAsync'),  # ajax request from fb
    path('market-evaluator/export/',
         views.MarketEvaluatorExport.as_view(), name='export'),
    path('market-evaluator/export-np/', views.MarketEvaluatorExportNoPipeline.as_view(),
         name='exportnp'),  # ajax request from fb
    path('market-evaluator/test/',
         views.MarketEvaluatorTest.as_view(), name='market-eval-test'),
    # GeoTargeting Views
    path('marketing/audience/', views.MarketingAudienceView.as_view(),
         name="marketing_audience"),
    path('marketing/account/', views.MarketingAccountView.as_view(),
         name="marketing_account"),
    path('marketing/geocheck/', views.MarketingAudienceGeoPixelCheck.as_view(),
         name="marketing_geocheck"),
    # Marketing Pin Conversion Endpoints
    path('marketing/convert/', views.MarketingConvertPolygons.as_view()),
    # Path mmWave Planner
    path('mmwave-planner/', views.MMWavePlannerView.as_view(), name='mmwaveplanner'),
    path('help-center/', views.MMWaveHelpCenterView.as_view(),
         name='mmwaveplanner-helpcenter'),
    path('', include('mmwave.urls', namespace='mmwave')),
    # Path Overlay
    path('overlay/', OverlaySource.as_view(), name='overlay_source'),
    path('asn/', ASNElasticSearchView.as_view(), name="asn-search"),
    # Sources Last Updated Dates
    path('sources/last-update/', CountrySourceUpdatedView.as_view(),
         name='source_updated_dates'),
    # REST API Endpoints
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/', include(router.urls)),
    # Workspace
    path('pro/', include('workspace.urls', namespace='workspace')),
    # Demo Views
    path('demo/solar-sizing-tool/',
         SolarSizingToolView.as_view(), name="demo-solar-sizing"),
    path('demo/los-check/', LOSCheckDemo.as_view(), name='demo-los-check'),
    path('demo/network-app/', NetworkDemoView.as_view(), name='demo-network-app'),
    path('demo/dsm-app/', DSMExportView.as_view(), name="demo-dsm-app"),
    path('demo/latest-gis-data/<int:year>/<int:month>/',
         LatestLidarView.as_view(), name='demo-latest_gis'),
    path('demo/latest-gis-data/', LatestLidarView.as_view(),
         name='demo-latest_gis-nodate'),
    # Redirect
    path('', views.HomepageRedirect.as_view()),
    # Django Hijack
    url(r'^hijack/', include('hijack.urls', namespace='hijack')),
    # Integration Test Endpoints - be sure to 404 in prod
    path('test/accounts/', IntegrationTestAccountCreationView.as_view(),
         name="test-accounts"),
    # Feature Flipper
    url(r'^', include('waffle.urls')),
    # New User Experiences - Admin Reset
    path('admin/update-nux/', UpdateNuxSettingView.as_view(), name="update-nux"),

    # Accounts / All Auth
    path('accounts/logout/', auth_views.LogoutView.as_view(), name="account_logout"),
] + \
    static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + \
    static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
# Facebook SDK Login
if not settings.ENABLE_ACCOUNT_CREATION:
    social_login = [
        path('fb-sdk/facebook/login/token/',
             views.HealthCheckView.as_view(), name="facebook_login_by_token"),
        path('fb-sdk/facebook/login/',
             views.HealthCheckView.as_view(), name="facebook_login"),
        path('fb-sdk/facebook/login/callback/',
             views.HealthCheckView.as_view(), name="facebook_callback"),
        path('fb-sdk/social/', include('allauth.socialaccount.urls')),
    ]
else:
    social_login = [
        path('fb-sdk/', include('allauth.socialaccount.providers.facebook.urls')),
        path('fb-sdk/social/', include('allauth.socialaccount.urls')),
    ]
urlpatterns += social_login

if settings.PROD:
    reverse_url = [
        path('reversejs/jsreverse.json',
             cache_page(3600)(reverse_views.urls_json), name='js_reverse_json'),
        path('reversejs/jsreverse.js',
             cache_page(3600)(reverse_views.urls_js), name='js_reverse'),
    ]
else:
    reverse_url = [
        path('reversejs/jsreverse.json',
             reverse_views.urls_json, name='js_reverse_json'),
        path('reversejs/jsreverse.js',
             reverse_views.urls_js, name='js_reverse'),
    ]

if settings.DEBUG:
     urlpatterns += [
          path('saml2/', include(('djangosaml2.urls', 'djangosaml2'), namespace='saml2')),
     ]


urlpatterns += reverse_url


handler500 = 'workspace.views.Error500View'  # noqa
handler404 = 'workspace.views.Error404View'  # noqa
handler403 = 'workspace.views.Error403View'  # noqa
