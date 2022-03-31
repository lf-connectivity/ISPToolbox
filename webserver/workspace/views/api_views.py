from django.shortcuts import render, redirect
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from rest_framework.authtoken.models import Token
from waffle import mixins


class TokenInspectorView(mixins.WaffleFlagMixin, LoginRequiredMixin, View):
    waffle_flag = "api"

    def get(self, request):
        try:
            token = Token.objects.get(user=request.user)
        except Token.DoesNotExist:
            token = None
        context = {'api_token': token}
        return render(request, "workspace/pages/token_inspector.index.html", context)

    def post(self, request):
        _token, _created = Token.objects.get_or_create(user=request.user)
        return redirect(request.path)
