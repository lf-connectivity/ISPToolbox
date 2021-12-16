from django.views import View
from django.contrib import admin
from workspace.mixins import SuperuserRequiredMixin
from django.shortcuts import render
from IspToolboxAccounts.models import User, PageVisit
from django.db.models import Count
from django.db.models import BooleanField, ExpressionWrapper, Q
from django.db.models.functions import Trunc
from collections import defaultdict
import datetime


class WorkspaceEngagementView(SuperuserRequiredMixin, View):
    def get(self, request):
        context = {**admin.site.each_context(request)}
        user_count = User.objects.filter(is_staff=False).count()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        page_visit_query = PageVisit.objects \
            .filter(created__gt=yesterday) \
            .annotate(created_day=Trunc('created', 'day')) \
            .annotate(user_id_null=ExpressionWrapper(
                Q(user_id__isnull=True),
                output_field=BooleanField()
            )) \
            .values('created_day') \
            .aggregate(
                users=Count('user_id', filter=Q(
                    user_id__isnull=False), distinct=True),
                sessions=Count('session_id', filter=Q(
                    user_id__isnull=True), distinct=True)
            )

        tool_breakdown = PageVisit.objects \
            .annotate(created_day=Trunc('created', 'day')) \
            .values('created_day') \
            .annotate(
                market_log_in=Count('user_id', filter=Q(user_id__isnull=False) & Q(
                    request__icontains='/pro/market/'), distinct=True),
                market_log_out=Count('session_id', filter=Q(user_id__isnull=True) & Q(
                    request__icontains='/pro/market/'), distinct=True),
                network_log_in=Count('user_id', filter=Q(user_id__isnull=False) & Q(
                    request__icontains='/pro/network/edit'), distinct=True),
                network_log_out=Count('session_id', filter=Q(user_id__isnull=True) & Q(
                    request__icontains='/pro/network/edit'), distinct=True),
            )

        chart = defaultdict(lambda: [])
        for b in tool_breakdown:
            timestamp = b['created_day'].timestamp() * 1000
            for k, v in b.items():
                if k != 'created_day':
                    chart[k].append([timestamp, v])

        context.update(
            {
                'stats': {
                    'user_count': user_count,
                    'todays_sessions': page_visit_query['sessions'],
                    'todays_users': page_visit_query['users'],
                    'tool_breakdown': chart
                }
            }
        )
        return render(request, "workspace/pages/admin_dashboard.html", context)
