from django.urls import path
from workspace.views import DefaultWorkspaceView

urlpatterns = [
    path('', DefaultWorkspaceView.as_view()),
]
