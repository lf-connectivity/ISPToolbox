from django.urls import path

from . import views

urlpatterns = [
    path('viewshed/', views.TowerLocatorCoverage.as_view(), name='coverage'),
]
