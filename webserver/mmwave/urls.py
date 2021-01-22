from django.urls import path
from mmwave.views import TGLinkView

urlpatterns = [
    path('link-check/', TGLinkView.as_view()),
]
