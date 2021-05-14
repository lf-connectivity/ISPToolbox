from django.urls import path
from mmwave import views as mmwave_views

urlpatterns = [
    path('admin/start-tiling/', mmwave_views.StartTilingJobView.as_view(), name='admin-tiling'),
]
