from django.urls import path
from workspace import views
from mmwave.views import CreateExportDSM
from IspToolboxAccounts.views import CreateAccountView
from django.contrib.auth import views as auth_views
from IspToolboxAccounts import forms
from django.views.generic import TemplateView
from rest_framework.schemas import get_schema_view


app_name = 'workspace'
urlpatterns = [
    path('', views.WorkspaceDashboard.as_view(), name='workspace_dashboard'),
    path('signin/', views.DefaultWorkspaceView.as_view(), name="sign_up_workspace"),
    path('optional-info/', views.OptionalInfoWorkspaceView.as_view(),
         name="optional_info"),
    path('optional-info/update/', views.OptionalInfoWorkspaceUpdateView.as_view(),
         name="optional_info_update"),
    # LOS
    path('network/edit/<uuid:session_id>/',
         views.EditNetworkView.as_view(), name="edit_network_by_uuid"),
    path('network/edit/<uuid:session_id>/<str:name>/',
         views.EditNetworkView.as_view(), name="edit_network"),
    path('network/edit/', views.EditNetworkView.as_view(),
         name="edit_account_network"),
    # Market Evaluator
    path('market/<uuid:session_id>/export/',
         views.MarketEvaluatorSessionExportView.as_view(), name="market_eval_export"),
    path('market/<uuid:session_id>/', views.MarketEvaluatorView.as_view()),
    path('market/<uuid:session_id>/<str:name>/',
         views.MarketEvaluatorView.as_view(), name="market_eval"),
    path('market/', views.MarketEvaluatorView.as_view(), name="market_eval_entry"),
    # DSM Export
    path('workspace/api/dsm-export/', CreateExportDSM.as_view()),
    path('workspace/api/dsm-export/<uuid:uuid>/', CreateExportDSM.as_view()),
    # Sources
    path('sources/<str:sources_page>/',
         views.WorkspaceSourcesView.as_view(), name="sources"),
    # Account Creation and Management
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
    path('workspace/account/',
         views.AccountSettingsView.as_view(), name="account_view"),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name="logout_view"),
    path('accounts/create/', CreateAccountView.as_view(),
         name="create_account_view"),
    path('account/delete/', views.DeleteYourInformationView.as_view(),
         name="delete_your_information"),
    path('account/access/', views.AccessYourInformationView.as_view(),
         name="access_your_information"),
    # Workspace Object Persistence
    path('workspace/api/ap-los/',
         views.AccessPointLocationListCreate.as_view(), name='ap'),
    path('workspace/api/ap-los/<uuid:uuid>/',
         views.AccessPointLocationGet.as_view(), name="get_ap_network"),
    path('workspace/api/cpe/', views.CPELocationCreate.as_view(), name="cpe"),
    path('workspace/api/cpe/<uuid:uuid>/', views.CPELocationGet.as_view()),
    path('workspace/api/ap-cpe-link/',
         views.APToCPELinkCreate.as_view(), name="ap-cpe-link"),
    path('workspace/api/ap-cpe-link/<uuid:uuid>/',
         views.APToCPELinkGet.as_view()),
    path('workspace/api/coverage-area/',
         views.CoverageAreaCreate.as_view(), name="coverage-area"),
    path('workspace/api/coverage-area/<uuid:uuid>/',
         views.CoverageAreaGet.as_view()),
    # Workspace
    path('workspace/api/ap-los/coverage/<uuid:uuid>/',
         views.AccessPointCoverageResults.as_view()),
    path('workspace/api/ap-los/coverage/stats/<uuid:uuid>/',
         views.AccessPointCoverageStatsView.as_view()),
    path('workspace/api/ap-los/coverage/<uuid:uuid>/',
         views.AccessPointCoverageResults.as_view()),
    path('workspace/api/ap-los/coverage/stats/<uuid:uuid>/',
         views.AccessPointCoverageStatsView.as_view()),
    path('workspace/api/tower/bulk-upload/',
         views.BulkUploadTowersView.as_view(), name="bulk_tower_upload"),
    path('workspace/api/session/<uuid:uuid>/',
         views.SessionCreateUpdateView.as_view(), name="session_update"),
    path('workspace/api/session/',
         views.SessionCreateUpdateView.as_view(), name="session_create"),
    path('workspace/api/session/download/<uuid:session_uuid>',
         views.SessionDownloadView.as_view(), name="session_download"),
    path('workspace/api/session/save-as/',
         views.SessionSaveAsView.as_view(), name="session_saveas"),
    path('workspace/api/session/list/',
         views.SessionListView.as_view(), name="session_list"),
    path('workspace/api/session/delete/<uuid:uuid>/',
         views.SessionDeleteView.as_view()),
    path('workspace/api/session/delete/',
         views.SessionDeleteView.as_view(), name="session_delete"),
    path('workspace/500/', views.Error500View, name='404'),
    # Potree Visualization
    path('workspace/api/visualization/<uuid:feature>/',
         views.PotreeVisualizationMetaView.as_view(), name="potree_viz"),
    # Workspace Session Import
    path('workspace/session/upload/kmz/',
         views.KMZImportView.as_view(), name='session_import_kmz'),
    # Facebook SDK Login
    path('fb/deauthorize-callback/',
         views.FBDeauthorizeSocialView.as_view(), name="fb_deauthorize"),
    path('fb/delete-callback/',
         views.FBDataDeletionView.as_view(), name="fb_deletion"),
    # Legal
    path('workspace/terms/', views.TermsOfService.as_view(), name="terms"),
    path('workspace/data-policy/', views.DataPolicy.as_view(), name="data_policy"),
    path('workspace/cookie-policy/', views.Cookies.as_view(), name="cookies"),
    # Browseable API
    path('swagger-ui/', TemplateView.as_view(
        template_name='swagger-ui.html',
        extra_context={'schema_url': 'workspace:openapi-schema'}
    ), name='swagger-ui'),
    path('openapi', get_schema_view(
        title="ISP Toolbox API",
        description="ISP Toolbox API to access lidar tools",
        version="1.0.0"
    ), name='openapi-schema'),

    # Multiplayer
    path('workspace/multiplayer/demo/',
         views.MultiplayerTestView.as_view(), name='multiplayer_demo'),
    path('workspace/multiplayer/demo/<uuid:session_id>/',
         views.MultiplayerTestView.as_view(), name='multiplayer_demo_uuid'),
    # Modals
    path('modals/market-eval-competitor-modal/',
         views.MarketEvaluatorCompetitorModalView.as_view()),
    # Tours
    path('workspace/tours/<str:tour_name>.js',
         views.NuxTourView.as_view(), name='tour'),
]
