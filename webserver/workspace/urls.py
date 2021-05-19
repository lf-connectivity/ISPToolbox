from django.urls import path
from workspace import views
from mmwave.views import CreateExportDSM
from IspToolboxAccounts.views import CreateAccountView
from django.contrib.auth import views as auth_views
from IspToolboxAccounts import forms


urlpatterns = [
    path('', views.DefaultWorkspaceView.as_view(), name="isptoolbox_pro_home"),
    path('optional-info/', views.OptionalInfoWorkspaceView.as_view(), name="optional_info"),
    path('optional-info/update/', views.OptionalInfoWorkspaceUpdateView.as_view(), name="optional_info_update"),
    path('networks/', views.DefaultNetworkView.as_view(), name="networks"),
    path('network/delete/<uuid:network_id>', views.DeleteNetworkView.as_view(), name="delete_network"),
    path('network/edit/<uuid:network_id>/', views.EditNetworkView.as_view(), name="edit_network"),
    path('network/edit/', views.EditNetworkView.as_view(), name="edit_account_network"),
    path('workspace/api/network/<uuid:pk>/', views.NetworkDetail.as_view()),
    path('workspace/api/dsm-export/', CreateExportDSM.as_view()),
    path('workspace/api/dsm-export/<uuid:uuid>/', CreateExportDSM.as_view()),
    path(
        'accounts/sign-in/',
        auth_views.LoginView.as_view(
            template_name='workspace/pages/login_view.html',
            authentication_form=forms.IspToolboxUserAuthenticationForm,
            extra_context={
                'showSignUp': False,
                'authentication_form': forms.IspToolboxUserAuthenticationForm,
                'sign_up_form': forms.IspToolboxUserCreationForm,
            }
        ),
        name="login_view"
    ),
    path('workspace/account/', views.AccountSettingsView.as_view(), name="account_view"),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name="logout_view"),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name="account_logout"),
    path('accounts/create/', CreateAccountView.as_view(), name="create_account_view"),
    path('workspace/api/network/', views.NetworkDetail.as_view()),
    path('workspace/api/ap-los/', views.AccessPointLocationListCreate.as_view()),
    path('workspace/api/ap-los/<uuid:uuid>/', views.AccessPointLocationGet.as_view()),
    path('workspace/api/cpe/', views.CPELocationCreate.as_view()),
    path('workspace/api/cpe/<uuid:uuid>/', views.CPELocationGet.as_view()),
    path('workspace/api/ap-cpe-link/', views.APToCPELinkCreate.as_view()),
    path('workspace/api/ap-cpe-link/<uuid:uuid>/', views.APToCPELinkGet.as_view()),
    path('workspace/api/ap-los/coverage/<uuid:uuid>/', views.AccessPointCoverageResults.as_view()),
    path('workspace/api/ap-los/coverage/stats/<uuid:uuid>/', views.AccessPointCoverageStatsView.as_view()),
    path('workspace/api/tower/bulk-upload/', views.BulkUploadTowersView.as_view(), name="bulk_tower_upload"),
    path('workspace/api/network/map/', views.NetworkMapPreferencesView.as_view(), name="map_preference_update"),
    path('workspace/500/', views.Error500View, name='404'),
    # Facebook SDK Login
    path('fb/deauthorize-callback/', views.FBDeauthorizeSocialView.as_view(), name="fb_deauthorize"),
    path('fb/delete-callback/', views.FBDataDeletionView.as_view(), name="fb_deletion"),
    # Legal
    path('workspace/terms/', views.TermsOfService.as_view(), name="terms"),
    path('workspace/data-policy/', views.DataPolicy.as_view(), name="data_policy"),
    path('workspace/cookie-policy/', views.Cookies.as_view(), name="cookies"),

    # Multiplayer
    path('workspace/multiplayer/demo/', views.MultiplayerTestView.as_view(), name='multiplayer_demo'),
    path('workspace/multiplayer/demo/<uuid:session_id>/', views.MultiplayerTestView.as_view(), name='multiplayer_demo_uuid'),
]
