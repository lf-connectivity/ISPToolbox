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
    # Marketing
    path('marketing/', views.ServiceabilityExportView.as_view(), name='serviceablility_export'),
    path('marketing/export/<uuid:uuid>.csv', views.ServiceabilityExportCsvView.as_view(), name="serviceability_export_csv"),
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
    path('workspace/api/ap-sector/', views.AccessPointSectorCreate.as_view(), name="ap_sector"),
    path('workspace/api/ap-sector/<uuid:uuid>/', views.AccessPointSectorGet.as_view()),
    path('workspace/api/ap-cpe-link/',
         views.APToCPELinkCreate.as_view(), name="ap-cpe-link"),
    path('workspace/api/ap-cpe-link/<uuid:uuid>/',
         views.APToCPELinkGet.as_view()),
    path('workspace/api/ptp-link/',
         views.PointToPointLinkCreate.as_view(), name="ptp-link"),
    path('workspace/api/ptp-link/<uuid:uuid>/',
         views.PointToPointLinkGet.as_view(), name="ptp-link-edit"),
    path('workspace/api/coverage-area/',
         views.CoverageAreaCreate.as_view(), name="coverage-area"),
    path('workspace/api/coverage-area/<uuid:uuid>/',
         views.CoverageAreaGet.as_view()),
    # Workspace
    path('workspace/api/ap-los/coverage/<uuid:uuid>/',
         views.AccessPointCoverageResults.as_view(), name="coverage-geojson"),
    path('workspace/api/ap-los/coverage/stats/<uuid:uuid>/',
         views.AccessPointCoverageStatsView.as_view(), name="coverage-stats"),
    path('workspace/api/tower/bulk-upload/',
         views.BulkUploadTowersView.as_view(), name="bulk_tower_upload"),
    path('workspace/api/session/<uuid:uuid>/',
         views.SessionCreateUpdateView.as_view(), name="session_update"),
    path('workspace/api/session/',
         views.SessionCreateUpdateView.as_view(), name="session_create"),
    path('workspace/api/session/download/<uuid:session_uuid>',
         views.SessionDownloadGeoJSONView.as_view(), name="session_download"),
    path('workspace/api/session/download/kml/<uuid:session_uuid>',
         views.SessionDownloadKMZView.as_view(), name="session_download_kmz"),
    path('workspace/api/session/save-as/',
         views.SessionSaveAsView.as_view(), name="session_saveas"),
    path('workspace/api/session/list/',
         views.SessionListView.as_view(), name="session_list"),
    path('workspace/api/session/delete/<uuid:uuid>/',
         views.SessionDeleteView.as_view(), name="session_delete"),
    # Forms
    path('workspace/form/ap-loc-form-<uuid:uuid>/',
         views.AccessPointLocationFormView.as_view(), name="ap-loc-form"),
    path('workspace/form/tower-form/<str:tool>/<uuid:uuid>/',
         views.TowerLocationFormView.as_view(), name="tower-form"),
    path('workspace/form/sector-form/<str:tool>/<uuid:uuid>/',
         views.SectorFormView.as_view(), name="sector-form"),
    path('workspace/form/sector-stats/<str:tool>/<uuid:uuid>/',
         views.SectorStatsView.as_view(), name="sector-stats"),
    path('workspace/form/cpe-forms/location/<uuid:session_id>/<str:lng>/<str:lat>/',
         views.LocationTooltipView.as_view(), name="los-location-form"),
    path('workspace/form/cpe-forms/cpe/<uuid:uuid>/',
         views.CPETooltipView.as_view(), name="cpe-form"),
    path('workspace/form/cpe-forms/sector-change/<uuid:session_id>/<str:lng>/<str:lat>/',
         views.SwitchSectorTooltipView.as_view(), name="cpe-switch-sector-form"),
    # Tables
    path('workspace/table/sessions/', views.SessionTableView.as_view(), name="sessions_table"),
    path('workspace/table/towers/', views.TowerTableView.as_view(), name="tower_table"),
    path('workspace/table/sectors/', views.SectorTableView.as_view(), name="sector_table"),
    path('workspace/table/serviceable/', views.SectorTableServiceableView.as_view(), name="sector_table_serviceable"),
    # Test
    path('workspace/test/session/', views.SessionTableTestView.as_view(), name="session_test"),
    path('workspace/test/tower/<uuid:uuid>/', views.TowerTableTestView.as_view(), name="tower_test"),
    path('workspace/test/sector/<uuid:uuid>/', views.SectorTableTestView.as_view(), name="sector_test"),
    # Ajax
    path('workspace/ajax/ap-los/coverage/<uuid:uuid>/',
         views.AccessPointCoverageResults.as_view(), name="viewshed_coverage"),
    path('workspace/ajax/ap-los/coverage/stats/<uuid:uuid>/',
         views.AccessPointCoverageStatsView.as_view(), name="viewshed_stats"),
    path('workspace/ajax/ap-los/coverage/overlay/<uuid:uuid>/',
         views.AccessPointCoverageViewshedOverlayView.as_view(), name="viewshed_overlay"),
    path('workspace/ajax/session/sidebar/<uuid:uuid>/',
         views.ToolSidebarView.as_view(), name="sidebar_view"),
    # Analytics
    path('workspace/api/analytics/events/',
         views.AnalyticsView.as_view(), name='analytics'),
    path('workspace/api/analytics/network/interventions/',
         views.NetworkToolInterventionsView.as_view()),
    path('workspace/500/', views.Error500View, name='404'),
    # Potree Visualization
    path('workspace/api/visualization/<uuid:feature>/',
         views.PotreeVisualizationMetaView.as_view(), name="potree_viz"),
    # Workspace Session Import
    path('workspace/session/upload/',
         views.SessionFileImportView.as_view(), name='session_import_kmz'),
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
    path('api/', views.TokenInspectorView.as_view(), name="api-home"),
    path('api/docs/', TemplateView.as_view(
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
