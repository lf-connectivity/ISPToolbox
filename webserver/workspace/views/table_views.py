from ajax_datatable.views import AjaxDatatableView
from workspace import models as workspace_models
from django.urls import reverse_lazy
from django.templatetags.static import static


class SessionTableView(AjaxDatatableView):
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
        {'name': 'edit', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
        {'name': 'delete', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
    ]

    def get_initial_queryset(self, request=None):
        if 'tool' in request.REQUEST:
            self.tool = request.REQUEST.get('tool')
        return self.model.get_rest_queryset(request)

    def customize_row(self, row, obj):
        # Load Images
        img_edit = static('isptoolbox/images/pen_icon.svg')
        img_delete = static('isptoolbox/images/trash_icon.svg')
        path_name = 'workspace:edit_network_by_uuid' if self.tool == 'los_check' else 'workspace:edit_market_by_uuid'
        path = reverse_lazy(
            path_name,
            kwargs={'session_id': obj.pk}
        )
        # Modify Rows
        row['name'] = f'<a href="{path}">{obj.name}</a>'
        row['last_updated'] = obj.last_updated.strftime("%m/%d/%Y<br><sub>%H:%M:%S</sub>")
        row['edit'] = f"""
            <button class="btn btn-edit btn-tooltip"
                hx-get="{reverse_lazy('workspace:ajax_session_update', kwargs={'pk': obj.pk})}"
                hx-swap="innerHTML"
                hx-target="#edit_modal_body"
                data-toggle="modal" data-target="#edit_modal" tabindex="-1"
                title data-original-title="Edit session">
               <img src="{img_edit}"/>
            </button>
        """
        row['delete'] = f"""
            <button href="#" class="btn btn-edit btn-tooltip"
                hx-get="{reverse_lazy('workspace:ajax_session_delete', kwargs={'pk': obj.pk})}"
                hx-swap="innerHTML"
                hx-target="#delete_modal_body"
                data-toggle="modal" data-target="#delete_modal" tabindex="-1"
                title data-original-title="Delete session">
               <img src="{img_delete}"/>
            </button>
        """


class TowerTableView(AjaxDatatableView):
    model = workspace_models.AccessPointLocation
    title = 'Tower Locations'
    initial_order = [["last_updated", "desc"], ]
    length_menu = [[10, 20, 50, 100, -1], [10, 20, 50, 100, 'all']]
    search_values_separator = '+'
    show_column_filters = False

    column_defs = [
        {'name': 'uuid', 'visible': False},
        {'name': 'name', 'visible': True},
        {'name': 'coordinates', 'title': 'Coordinates', 'visible': True, 'searchable': False, 'orderable': False},
        {'name': 'sector_count', 'title': 'Sectors', 'visible': True, 'searchable': False, 'orderable': False},
        {'name': 'last_updated', 'title': 'Modified', 'visible': True},
        {'name': 'edit', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
        {'name': 'delete', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
    ]

    def get_initial_queryset(self, request=None):
        qs = self.model.get_rest_queryset(request)
        if 'map_session' in request.REQUEST:
            qs = qs.filter(map_session_id=request.REQUEST.get('map_session'))
        return qs

    def customize_row(self, row, obj):
        img_edit = static('isptoolbox/images/pen_icon.svg')
        img_delete = static('isptoolbox/images/trash_icon.svg')
        img_view = static('isptoolbox/images/tower_icon.svg')

        row['coordinates'] = "{:.6f}, {:.6f}".format(obj.lat, obj.lng)
        row['last_updated'] = obj.last_updated.strftime("%m/%d/%Y<br><sub>%H:%M:%S</sub>")
        row['sector_count'] = f"""
            <a href="#" class="btn btn-edit btn-tooltip d-flex" data-tower="{obj.pk}"
                data-session="{obj.map_session.pk}"
                data-toggle="modal" tabindex="-1" data-target="#sector_modal"
                title data-original-title="View Access Points">
               {obj.sector_count}<img class="my-auto ml-3" src="{img_view}"/>
            </a>
        """
        row['edit'] = f"""
            <button class="btn btn-edit btn-tooltip"
                hx-get="{reverse_lazy('workspace:ajax_tower_update', kwargs={'pk': obj.pk})}"
                hx-swap="innerHTML"
                hx-target="#edit_modal_body"
                data-toggle="modal" data-target="#edit_modal" tabindex="-1"
                title data-original-title="Edit tower">
               <img src="{img_edit}"/>
            </button>
        """
        row['delete'] = f"""
            <button href="#" class="btn btn-edit btn-tooltip"
                hx-get="{reverse_lazy('workspace:ajax_tower_delete', kwargs={'pk': obj.pk})}"
                hx-swap="innerHTML"
                hx-target="#delete_modal_body"
                data-toggle="modal" data-target="#delete_modal" tabindex="-1"
                title data-original-title="Delete tower">
               <img src="{img_delete}"/>
            </button>
        """


class SectorTableView(AjaxDatatableView):
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
            tower_qs = workspace_models.AccessPointLocation.get_rest_queryset(request)
            tower = tower_qs.get(pk=request.REQUEST.get('tower'))
            self.units = tower.map_session.units
        return qs

    def customize_row(self, row, obj):
        # Load Images
        img_edit = static('isptoolbox/images/pen_icon.svg')
        img_delete = static('isptoolbox/images/trash_icon.svg')
        # Modify Rows
        if hasattr(self, 'units'):
            if self.units == workspace_models.WorkspaceMapSession.UnitPreferences.METRIC:
                row['radius'] = f"{obj.radius} km"
                row['height'] = f"{obj.height} m"
                row['default_cpe_height'] = f"{obj.default_cpe_height} m"
            else:
                row['radius'] = f"{obj.radius_miles} mi"
                row['height'] = f"{obj.height_ft} ft"
                row['default_cpe_height'] = f"{obj.default_cpe_height_ft} ft"

        row['last_updated'] = obj.last_updated.strftime("%m/%d/%Y<br><sub>%H:%M:%S</sub>")
        row['frequency'] = f"{obj.frequency} GHz"
        row['edit'] = f"""
            <button class="btn btn-edit btn-tooltip"
                hx-get="{reverse_lazy('workspace:ajax_sector_update', kwargs={'pk': obj.pk})}"
                hx-swap="innerHTML"
                hx-target="#edit_modal_body"
                data-toggle="modal" data-target="#edit_modal" tabindex="-1"
                title data-original-title="Edit AP">
               <img src="{img_edit}"/>
            </button>
        """
        row['delete'] = f"""
            <button href="#" class="btn btn-edit btn-tooltip"
                hx-get="{reverse_lazy('workspace:ajax_sector_delete', kwargs={'pk': obj.pk})}"
                hx-swap="innerHTML"
                hx-target="#delete_modal_body"
                data-toggle="modal" data-target="#delete_modal" tabindex="-1"
                title data-original-title="Delete AP">
               <img src="{img_delete}"/>
            </button>
        """


class SectorTableServiceableView(AjaxDatatableView):
    """
    This view is used to export a csv of all serviceable building outlines
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
        {'name': 'map_session', 'title': 'Session', 'foreign_field': 'map_session__name', 'visible': True},
        {
            'name': 'status',
            'title': 'Status',
            'visible': True, 'placeholder': True,
            'defaultContent': 'N/A',
            'searchable': False,
            'orderable': False
        },
        {
            'name': 'serviceable',
            'title': 'Serviceable Buildings',
            'visible': True, 'placeholder': True,
            'searchable': False,
            'orderable': False
        },
        {
            'name': 'unserviceable',
            'title': 'Unserviceable Buildings',
            'visible': True,
            'placeholder': True,
            'searchable': False,
            'orderable': False
        },
        {'name': 'last_updated', 'title': 'Modified', 'visible': True},
        {'name': 'export', 'title': '', 'placeholder': True, 'searchable': False, 'orderable': False, },
    ]

    def get_initial_queryset(self, request=None):
        qs = self.model.get_rest_queryset(request)
        if 'tower' in request.REQUEST:
            qs = qs.filter(ap_id=request.REQUEST.get('tower'))
        return qs

    def customize_row(self, row, obj):
        row['last_updated'] = obj.last_updated.strftime("%m/%d/%Y<br><sub>%H:%M:%S</sub>")
        try:
            row['serviceable'] = obj.building_coverage.coverageStatistics()['serviceable']
            row['unserviceable'] = obj.building_coverage.coverageStatistics()['unserviceable']
            row['status'] = obj.building_coverage.status
        except Exception:
            row['serviceable'] = 'N/A'
            row['unserviceable'] = 'N/A'
            row['status'] = 'N/A'
        export_url = reverse_lazy('workspace:serviceability_export_csv', kwargs={'uuid': obj.pk})
        row['export'] = f"""
            <a href="{export_url}" download class="btn btn-info btn-edit btn-tooltip">
               Export
            </a>
        """
