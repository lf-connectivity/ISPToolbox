from django.urls import path
from workspace.views import DefaultWorkspaceView, DefaultNetworkView, DeleteNetworkView, EditNetworkView
from workspace import views
from mmwave.views import CreateExportDSM
from IspToolboxAccounts.views import CreateAccountView
from django.contrib.auth import views as auth_views


urlpatterns = [
    path('', DefaultWorkspaceView.as_view(), name="isptoolbox_pro_home"),
    path('networks/', DefaultNetworkView.as_view(), name="networks"),
    path('network/delete/<uuid:network_id>', DeleteNetworkView.as_view(), name="delete_network"),
    path('network/edit/<uuid:network_id>/', EditNetworkView.as_view(), name="edit_network"),
    path('workspace/api/network/<uuid:pk>/', views.NetworkDetail.as_view()),
    path('workspace/api/dsm-export/', CreateExportDSM.as_view()),
    path('workspace/api/dsm-export/<uuid:uuid>/', CreateExportDSM.as_view()),
    path('accounts/sign-in/', auth_views.LoginView.as_view(template_name='workspace/pages/default.html'), name="login_view"),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name="logout_view"),
    path('accounts/create/', CreateAccountView.as_view(), name="create_account_view"),
]
