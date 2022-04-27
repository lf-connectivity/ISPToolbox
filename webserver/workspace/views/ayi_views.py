from django.shortcuts import redirect, render
from django.views import View
from IspToolboxAccounts.forms import IspToolboxAccessDataForm
from workspace.models import AccessInformationJob
from django.core.paginator import Paginator
from celery.states import READY_STATES
from guest_user.mixins import RegularUserRequiredMixin


class AccessYourInformationView(RegularUserRequiredMixin, View):
    """
    This view allows users to download their information
    We don't really have an obligation for it to be easily parseable -
    so dumping everything into a json file is acceptable
    """

    def get(self, request):
        data_requests = AccessInformationJob.objects.filter(
            owner=request.user).order_by('-created').all()
        paginator = Paginator(data_requests, 5)
        page_obj = paginator.get_page(request.GET.get('page'))
        context = {'access_data_form': IspToolboxAccessDataForm,
                   'data_requests': page_obj}
        return render(request, 'workspace/pages/ayi.index.html', context=context)

    def post(self, request):
        # Check if user has a job currently running
        if AccessInformationJob.objects.filter(owner=request.user).exists():
            latest = AccessInformationJob.objects.filter(
                owner=request.user).order_by('-created').first()
            if latest.data_dump or latest.task_result is None or latest.task_result.status in READY_STATES:
                self.create_download_job(request)
        else:
            self.create_download_job(request)
        return redirect(request.get_full_path())

    def create_download_job(self, request):
        job = AccessInformationJob(owner=request.user)
        job.save()
        job.startExportTask()
