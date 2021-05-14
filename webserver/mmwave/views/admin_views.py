from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from django.utils.decorators import method_decorator
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import redirect
from mmwave import tasks as mmwave_tasks


@method_decorator(staff_member_required, name="dispatch")
class StartTilingJobView(LoginRequiredMixin, View):
    def post(self, request):
        cloud = request.POST.get('cloud')
        next = request.POST.get('next')
        _ = mmwave_tasks.convertPtCloudToDSMTiled.delay(pk=cloud)
        return redirect(next)
