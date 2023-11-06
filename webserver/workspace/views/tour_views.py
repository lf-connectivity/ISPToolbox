# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.views import View
from django.shortcuts import render


class NuxTourView(View):
    def get(self, request, tour_name=None):
        templates = {
            'market': 'workspace/organisms/tour_market.js',
            'network': 'workspace/organisms/tour_network.js',
        }
        return render(request, templates.get(tour_name), {}, content_type="application/x-javascript")
