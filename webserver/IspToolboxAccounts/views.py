from django.contrib.auth import login, authenticate
from django.views import View
from IspToolboxAccounts.forms import IspToolboxUserCreationForm
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render
from django.conf import settings
from django.utils.http import (
    url_has_allowed_host_and_scheme
)


class CreateAccountView(View):
    def post(self, request):
        form = IspToolboxUserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('email')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user, backend=settings.AUTHENTICATION_BACKENDS[0])
        next_url = request.POST.get('next', request.GET.get('next', None))
        url_is_safe = url_has_allowed_host_and_scheme(
            url=next_url,
            allowed_hosts=self.request.get_host(),
            require_https=self.request.is_secure()
        )
        if next_url is not None and url_is_safe:
            return redirect(next_url)
        return render(
            request,
            'workspace/pages/login_view.html',
            {
                'showSignUp': True,
                'sign_in_form': AuthenticationForm,
                'sign_up_form': form,
            }
        )

    def get(self, request):
        return redirect("isptoolbox_pro_home")
