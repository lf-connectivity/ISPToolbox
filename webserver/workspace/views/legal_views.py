from django.shortcuts import render
from django.views import View


class DataPolicy(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/data_policy.html'
        )


class Cookies(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/cookies.html'
        )


class TermsOfService(View):
    def get(self, request, **kwargs):
        return render(
            request,
            'workspace/pages/terms_of_service.html'
        )
