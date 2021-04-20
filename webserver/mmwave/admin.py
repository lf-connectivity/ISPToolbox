from django.contrib import admin
from mmwave.models import TGLink, LOSSummary, EPTLidarPointCloud, USGSLidarMetaDataModel
from django.db.models import Count
from django.db.models.functions import Trunc
from django.db.models import DateTimeField
import pytz
from IspToolboxApp.util.admin_timeseries_util import (
    get_next_in_date_hierarchy, daterange, get_request_datetime
)


@admin.register(TGLink)
class TGLinkAdmin(admin.ModelAdmin):
    list_display = ("uuid", "created", "linklength_m", "fbid")


admin.site.register(EPTLidarPointCloud)
admin.site.register(USGSLidarMetaDataModel)


@admin.register(LOSSummary)
class LOSSummaryAdmin(admin.ModelAdmin):
    change_list_template = 'admin/los_summary_list.html'
    date_hierarchy = 'created'

    def changelist_view(self, request, extra_context=None):
        response = super().changelist_view(
            request,
            extra_context=extra_context,
        )
        try:
            qs = response.context_data['cl'].queryset
        except (AttributeError, KeyError):
            return response

        metrics = {
            'count': Count('fbid'),
        }
        response.context_data['summary'] = list(
            qs
            .values('fbid')
            .annotate(**metrics)
            .order_by('-count')
        )
        response.context_data['summary_total'] = dict(
            qs.aggregate(**metrics)
        )
        requested_datetime = get_request_datetime(request, self.date_hierarchy)
        period = get_next_in_date_hierarchy(
            request,
            self.date_hierarchy,
        )
        usage = list(
            qs.annotate(
                period=Trunc(
                    'created',
                    period,
                    output_field=DateTimeField(),
                ),
            ).values('period')
            .annotate(total=Count('uuid'))
            .order_by('period')
        )
        active_times = {
            v['period'].replace(tzinfo=pytz.utc).timestamp():  v['total'] for v in usage
        }
        requested_datetime = get_request_datetime(request, self.date_hierarchy)
        endtime = None

        if len(usage) > 1 and period == 'month':
            requested_datetime = usage[0]['period']
            endtime = usage[-1]['period']

        usage = [
            [
                v.replace(tzinfo=pytz.utc).timestamp() * 1000,
                active_times[v.replace(tzinfo=pytz.utc).timestamp()]
                if v.replace(tzinfo=pytz.utc).timestamp() in active_times
                else 0
            ]
            for v in daterange(requested_datetime, endtime=endtime, time=period)
        ]
        response.context_data['time_series_usage'] = usage

        return response
