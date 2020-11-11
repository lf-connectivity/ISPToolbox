from django.urls import path
from django.contrib.admin.views.decorators import staff_member_required
from mmwave.views import TGLinkView, LinkGISDataView, UpdateLidarBoundariesView

urlpatterns = [
    path('add-boundary/', staff_member_required(UpdateLidarBoundariesView.as_view())),
    path('link-check/', TGLinkView.as_view()),
    path('link-check/gis/', LinkGISDataView.as_view()),
]
