from django.contrib import admin
from mmwave.models import TGLink, LOSSummary
from django.db.models import Count

admin.site.register(TGLink)


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
        return response
