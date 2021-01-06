from django.urls import path
from workspace.views import DefaultWorkspaceView, DefaultNetworkView, DeleteNetworkView, EditNetworkView
from workspace import views

urlpatterns = [
    path('', DefaultWorkspaceView.as_view(), name="isptoolbox_pro_home"),
    path('networks/', DefaultNetworkView.as_view(), name="networks"),
    path('network/delete/<uuid:network_id>', DeleteNetworkView.as_view(), name="delete_network"),
    path('network/edit/<uuid:network_id>/', EditNetworkView.as_view(), name="edit_network"),
    path('workspace/api/network/<uuid:pk>/', views.NetworkDetail.as_view())
]
