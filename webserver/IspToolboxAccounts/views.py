from django.contrib.auth import login, authenticate
from django.views import View
from IspToolboxAccounts.forms import IspToolboxUserCreationForm
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render


class CreateAccountView(View):
    def post(self, request):
        form = IspToolboxUserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            raw_password = form.cleaned_data.get('password1')
            user = authenticate(username=username, password=raw_password)
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        if request.GET.get('next', None) is not None:
            redirect(request.GET.get('next'))
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
