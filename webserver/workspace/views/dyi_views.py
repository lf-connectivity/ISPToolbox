# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.shortcuts import redirect, render
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from IspToolboxAccounts.forms import IspToolboxUserDeleteAccountForm
from workspace.models import DeleteInformationJob
from django.contrib.auth import logout


class DeleteYourInformationView(LoginRequiredMixin, View):
    """
    This view allows a user to request that their account de deleted

    The account is marked as invalid and an async job is started to delete their account
    """

    def get(self, request):
        context = {
            'delete_account_form': IspToolboxUserDeleteAccountForm}
        return render(request, 'workspace/pages/dyi.index.html', context=context)

    def post(self, request):
        form = IspToolboxUserDeleteAccountForm(request.POST)
        if form.is_valid():
            user = request.user
            user.is_active = False
            user.save()

            job = DeleteInformationJob(user=request.user)
            job.save()

            logout(request)
            job.startUserDataDeletion()
        else:
            context = {'delete_account_form': form}
            return render(request, 'workspace/pages/dyi.index.html', context=context)
        return redirect(request.get_full_path())
