from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from django.utils.decorators import method_decorator
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import redirect, render
from mmwave import tasks as mmwave_tasks
from mmwave import models
from django.contrib.gis.geos import Point
from mmwave.lidar_utils.SlippyTiles import deg2num, DEFAULT_OUTPUT_ZOOM
from django.contrib import admin
import logging


@method_decorator(staff_member_required, name="dispatch")
class StartTilingJobView(LoginRequiredMixin, View):
    def post(self, request):
        cloud = request.POST.get('cloud')
        next = request.POST.get('next')
        _ = mmwave_tasks.convertPtCloudToDSMTiled.delay(pk=cloud)
        return redirect(next)


@method_decorator(staff_member_required, name="dispatch")
class CheckLidarDSMAvailability(LoginRequiredMixin, View):
    def get(self, request):
        context = {**admin.site.each_context(request)}
        return render(request, 'admin/mmwave/check_lidar_availability.html', context=context)

    def post(self, request):
        context = {**admin.site.each_context(request)}
        try:
            location = request.POST.get('location')
            coords = location.split(",")
            point = Point(x=float(coords[1]), y=float(coords[0]))
            clouds = models.EPTLidarPointCloud.query_intersect_aoi(
                point)
            tilex, tiley = deg2num(point.y, point.x)
            for cld in clouds:
                if cld.existsTile(tilex, tiley, DEFAULT_OUTPUT_ZOOM):
                    setattr(cld, 'tile_exists', True)
            result = {'clouds': clouds}
            context.update({'result': result})
            return render(request, 'admin/mmwave/check_lidar_availability.html', context=context)
        except Exception as e:
            logging.error(e)
            return redirect(request.get_full_path())
