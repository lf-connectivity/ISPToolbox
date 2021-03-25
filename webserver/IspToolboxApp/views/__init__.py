from django.shortcuts import render
from django.views import View
from django.http import HttpResponse


class SocialLoginView(View):
    def get(self, request):
        return render(request, 'index.html')


class HealthCheckView(View):
    def get(self, request):
        return HttpResponse()


class MarketEvaluatorTest(View):
    def get(self, request):
        return render(request, 'market_evaluator/sample_market_evaluator.html')
