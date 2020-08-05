"""deep_gis URL Configuration

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
from webserver.IspToolboxApp import views

urlpatterns = [
    path('', views.HealthCheckView.as_view(), name='healthcheck'),
    path('admin/', admin.site.urls),
    path('login/', views.SocialLoginView.as_view(), name='login'),
    path('accounts/', include('allauth.urls')),
    path('gis/aoi/', views.index),
    path('gis/task/<str:task_id>/', views.TaskView.as_view(), name='task'),
    path('gis/progress/<str:task_id>/', views.ProgressView.as_view(), name='progress'),
    path('gis/result/<str:task_id>/', views.ResultView.as_view(), name='result'),
    path('gis/osmBuildings/', views.BuildingsView.as_view(), name='osmBuildings'),
    path('market-evaluator/market-income/', views.IncomeView.as_view(), name='PRIncome'),
    path('market-evaluator/market-competition/', views.Form477View.as_view(), name='PRIncome'),
    path('market-evaluator/market-providers/', views.ServiceProviders.as_view(), name='Providers'),
    path('market-evaluator/market-count/', views.CountBuildingsView.as_view(), name='PRIncome'),
    path('market-evaluator/market-size/', views.BuildingsView.as_view(), name='BuildingOutlines'),
    path('market-evaluator/market-rdof/', views.RDOFView.as_view(), name='PRIncome'),
    path('market-evaluator/market-data-available/', views.DataAvailableView.as_view(), name='PRIncome')
]
