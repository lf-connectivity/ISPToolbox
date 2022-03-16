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
    initial_order = [["last_updated", "desc"], ]
    length_menu = [[10, 20, 50, 100, -1], [10, 20, 50, 100, 'all']]
    search_values_separator = '+'
    show_column_filters = False

    column_defs = [
        {'name': 'id', 'visible': False},
        {'name': 'name', 'visible': True},
        {
            'name': 'number_of_towers',
            'title': 'Towers',
            'searchable': False,
            'orderable': False,
            'visible': True
        },
        {'name': 'last_updated', 'visible': True},
    ]

    def get_initial_queryset(self, request=None):
        return self.model.get_rest_queryset(request)

    def customize_row(self, row, obj):
        path = reverse_lazy('workspace:edit_network_by_uuid', kwargs={'session_id': obj.pk})
        row['name'] = f'<a href={path}>{obj.name}</a>'


class TowerTableView(AjaxDatatableView):
    """

    """
    model = workspace_models.AccessPointLocation
    title = 'Tower Locations'
    initial_order = [["last_updated", "desc"], ]
    length_menu = [[10, 20, 50, 100, -1], [10, 20, 50, 100, 'all']]
    search_values_separator = '+'
    show_column_filters = False

    column_defs = [
        {'name': 'uuid', 'visible': False},
        {'name': 'name', 'visible': True},
        {'name': 'max_radius', 'visible': True},
        {'name': 'height', 'visible': True},
        {'name': 'coordinates', 'title': 'Coordinates', 'visible': True, 'searchable': False, 'orderable': False},
        {'name': 'sector_count', 'title': 'Sectors', 'visible': True, 'searchable': False, 'orderable': False},
        {'name': 'last_updated', 'title': 'Modified', 'visible': True},
        {'name': 'view', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
        {'name': 'edit', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
        {'name': 'delete', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
    ]

    def get_initial_queryset(self, request=None):
        qs = self.model.get_rest_queryset(request)
        if 'map_session' in request.REQUEST:
            qs = qs.filter(map_session_id=request.REQUEST.get('map_session'))
        return qs

    def customize_row(self, row, obj):
        row['view'] = f"""
            <a href="{reverse_lazy('workspace:sector_test', kwargs={'uuid': obj.pk})}" class="btn btn-info btn-edit">
               View
            </a>
        """
        row['edit'] = """
            <a href="#" class="btn btn-info btn-edit">
               Edit
            </a>
        """
        row['delete'] = """
            <a href="#" class="btn btn-info btn-edit">
               Delete
            </a>
        """


class SectorTableView(AjaxDatatableView):
    """

    """
    model = workspace_models.AccessPointSector
    title = 'Access Points'
    initial_order = [["last_updated", "desc"], ]
    length_menu = [[10, 20, 50, 100, -1], [10, 20, 50, 100, 'all']]
    search_values_separator = '+'
    show_column_filters = False

    column_defs = [
        {'name': 'uuid', 'visible': False},
        {'name': 'name', 'visible': True},
        {'name': 'heading', 'visible': True},
        {'name': 'azimuth', 'visible': True},
        {'name': 'height', 'title': 'Access Point<br><sub>Height above Ground</sub>', 'visible': True},
        {'name': 'default_cpe_height', 'title': 'Customer Antenna<br><sub>Height above Rooftop</sub>', 'visible': True},
        {'name': 'radius', 'title': 'Distance', 'visible': True},
        {'name': 'frequency', 'title': 'Frequency', 'visible': True},
        {'name': 'last_updated', 'title': 'Modified', 'visible': True},
        {'name': 'edit', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
        {'name': 'delete', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
    ]

    def get_initial_queryset(self, request=None):
        qs = self.model.get_rest_queryset(request)
        if 'tower' in request.REQUEST:
            qs = qs.filter(ap_id=request.REQUEST.get('tower'))
        return qs

    def customize_row(self, row, obj):
        row['edit'] = """
            <a href="#" class="btn btn-info btn-edit">
               Edit
            </a>
        """
        row['delete'] = """
            <a href="#" class="btn btn-info btn-edit">
               Delete
            </a>
        """


class SessionTableTestView(View):
    def get(self, request):
        return render(request, 'workspace/pages/test_session_table.html', {})


class TowerTableTestView(View):
    def get(self, request, **kwargs):
        return render(request, 'workspace/pages/test_tower_table.html', {'url_pattern': kwargs})


class SectorTableTestView(View):
    def get(self, request, **kwargs):
        return render(request, 'workspace/pages/test_sector_table.html', {'url_pattern': kwargs})
