from django.urls import path
from mmwave.views import TGLinkView, LinkGISDataView

urlpatterns = [
    path('link-check/', TGLinkView.as_view()),
    path('link-check/gis/', LinkGISDataView.as_view()),
]
