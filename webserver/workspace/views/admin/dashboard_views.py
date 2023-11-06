# (c) Meta Platforms, Inc. and affiliates. Copyright
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
from django_celery_results.models import TaskResult
from celery import states
from revproxy.views import ProxyView
from webserver import settings
from django.utils.decorators import method_decorator
from IspToolboxAccounts.admin import admin_required


class CeleryTaskPerformanceView(SuperuserRequiredMixin, View):
    def get(self, request):
        context = {**admin.site.each_context(request)}
        count = TaskResult.objects.count()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        time_window = datetime.date.today() - datetime.timedelta(days=90)

        aggregation = {str(state): Count('task_id', filter=Q(status=state)) for state in states.ALL_STATES}

        daily = TaskResult.objects \
            .filter(date_created__gt=yesterday) \
            .annotate(date_created_day=Trunc('date_created', 'day')) \
            .values('date_created_day') \
            .aggregate(
                **aggregation
            )

        timeseries = TaskResult.objects \
            .filter(date_created__gt=time_window) \
            .annotate(date_created_day=Trunc('date_created', 'day')) \
            .values('date_created_day') \
            .annotate(
                **aggregation
            ) \
            .order_by()

        chart = defaultdict(lambda: [])
        for b in timeseries:
            timestamp = b['date_created_day'].timestamp() * 1000
            for k, v in b.items():
                if k != 'date_created_day':
                    chart[k].append([timestamp, v])

        context.update(
            {
                'chart': 'percentage',
                'stats': {
                    'object_name': 'Task',
                    'count': count,
                    'daily_breakdown': daily,
                    'timeseries': chart
                }
            }
        )
        return render(request, "workspace/pages/admin_dashboard.html", context)


class WorkspaceEngagementView(SuperuserRequiredMixin, View):
    def get(self, request):
        context = {**admin.site.each_context(request)}
        count = User.objects.filter(is_staff=False).count()
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        time_window = datetime.date.today() - datetime.timedelta(days=90)

        daily = PageVisit.objects \
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

        timeseries = PageVisit.objects \
            .filter(created__gt=time_window) \
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
            ) \
            .order_by()

        chart = defaultdict(lambda: [])
        for b in timeseries:
            timestamp = b['created_day'].timestamp() * 1000
            for k, v in b.items():
                if k != 'created_day':
                    chart[k].append([timestamp, v])

        context.update(
            {
                'stats': {
                    'object_name': 'user',
                    'count': count,
                    'daily_breakdown': daily,
                    'timeseries': chart
                }
            }
        )
        return render(request, "workspace/pages/admin_dashboard.html", context)


class FlowerAsyncDashboardView(ProxyView):
    upstream = 'http://flower:5555'

    def get_request_headers(self):
        request_headers = super().get_request_headers()
        request_headers['Host'] = 'isptoolbox.io' if settings.PROD else 'localhost'
        request_headers['Upgrade'] = 'Upgrade'
        request_headers['Connection'] = 'Upgrade'
        return request_headers

    @method_decorator(admin_required)
    def dispatch(self, request, *args, **kwargs):
        # Get rid of leading / in path
        request.path = request.path[1:]
        return super().dispatch(request, request.path)
