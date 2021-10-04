from django.urls import path
from mmwave import views as mmwave_views

app_name = 'mmwave'
urlpatterns = [
    path('admin/start-tiling/',
         mmwave_views.StartTilingJobView.as_view(), name='admin-tiling'),
    path('admin/tile-check/',
         mmwave_views.CheckLidarDSMAvailability.as_view(), name='tile-check')
]
