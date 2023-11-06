# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.shortcuts import redirect
from django.views import View


class HomepageRedirect(View):
    def get(self, request):
        return redirect('https://www.facebook.com/isptoolbox/', permanent=True)
