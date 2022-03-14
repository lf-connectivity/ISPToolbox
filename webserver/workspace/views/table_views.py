from ajax_datatable.views import AjaxDatatableView
from django.shortcuts import render
from django.views import View
from workspace import models as workspace_models
from django.urls import reverse_lazy

class SessionTableView(AjaxDatatableView):
    """
    
    """
    model = workspace_models.WorkspaceMapSession
    title = 'Open a Session'
    initial_order = [["last_updated", "asc"], ]
    length_menu = [[10, 20, 50, 100, -1], [10, 20, 50, 100, 'all']]
    search_values_separator = '+'
    show_column_filters = False

    column_defs = [
        {'name': 'id', 'visible': False, },
        {'name': 'name', 'visible': True, },
        {'name': 'number_of_towers', 'title': 'Towers','searchable': False, 'orderable': False, 'visible': True, },
        {'name': 'last_updated', 'visible': True, },
    ]

    def get_initial_queryset(self, request=None):
        return self.model.get_rest_queryset(request)

    def customize_row(self, row, obj):
        path = reverse_lazy('workspace:edit_network_by_uuid', kwargs={'session_id': obj.pk})
        row['name'] = f'<a href={path}>{obj.name}</a>'

class TableTestView(View):
    def get(self, request):
        return render(request, 'workspace/pages/test_session_table.html', {})