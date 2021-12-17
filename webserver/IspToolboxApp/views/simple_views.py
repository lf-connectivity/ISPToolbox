from django.shortcuts import render
from django.views import View
from django.http import HttpResponse


class RespondOkView(View):
    def get(self, request):
        return HttpResponse('ok')


class MarketEvaluatorTest(View):
    def get(self, request):
        return render(request, 'market_evaluator/sample_market_evaluator.html')
