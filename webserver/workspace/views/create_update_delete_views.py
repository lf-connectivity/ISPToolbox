# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.shortcuts import render
from django.views.generic.edit import DeleteView, UpdateView, CreateView
from workspace import models as workspace_models
from workspace import forms as workspace_forms


class HTMXDeleteMixin:
    """
    Sends html snippet on htmx request, regular delete view response otherwise
    """
    def delete(self, request, *args, **kwargs):
        if request.htmx:
            self.object = self.get_object()
            pk = self.object.pk
            self.object.delete()
            self.object.pk = pk
            context = self.get_context_data()
            context.update({'object': self.object})
            return render(request, 'workspace/forms/delete_success.html', context)
        else:
            return super(HTMXDeleteMixin, self).delete(request, *args, **kwargs)


class HTMXUpdateMixin:
    """
    Sends html snippet on htmx request, regular update view response otherwise
    """
    def form_valid(self, form):
        if self.request.htmx:
            self.object = form.save()
            context = self.get_context_data()
            context.update({'object': self.object})
            return render(self.request, 'workspace/forms/update_success.html', context)
        else:
            return super(HTMXUpdateMixin, self).form_valid(form)


class HTMXCreateMixin:
    """
    Sends html snippet on htmx request, regular create view response otherwise
    """
    def pre_save_form(self, form):
        return super().pre_save_form(form)

    def form_valid(self, form):
        if self.request.htmx:
            self.pre_save_form(form)
            self.object = form.save()
            context = self.get_context_data()
            context.update({'object': self.object})
            return render(self.request, 'workspace/forms/create_success.html', context)
        else:
            return super(HTMXCreateMixin, self).form_valid(form)


class SessionDeleteView(HTMXDeleteMixin, DeleteView):
    model = workspace_models.WorkspaceMapSession
    template_name = 'workspace/forms/delete.html'

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)


class SessionUpdateView(HTMXUpdateMixin, UpdateView):
    model = workspace_models.WorkspaceMapSession
    fields = ['name']
    template_name = 'workspace/forms/update.html'

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)


class SessionCreateView(HTMXCreateMixin, CreateView):
    model = workspace_models.WorkspaceMapSession
    fields = ['name']
    template_name = 'workspace/forms/create.html'

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)


class TowerDeleteView(HTMXDeleteMixin, DeleteView):
    model = workspace_models.AccessPointLocation
    template_name = 'workspace/forms/delete.html'

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)

    def get_context_data(self, **kwargs):
        """Insert the form into the context dict."""
        if 'breadcrumb' not in kwargs:
            kwargs['breadcrumb'] = [
                {'name': 'Tower', 'modal': 'tower_modal'},
                {'name': 'Delete'}
            ]
        if 'confirm' not in kwargs:
            kwargs['confirm'] = 'tower_modal'
        return super().get_context_data(**kwargs)


class TowerUpdateView(HTMXUpdateMixin, UpdateView):
    model = workspace_models.AccessPointLocation
    template_name = 'workspace/forms/update.html'
    form_class = workspace_forms.AccessPointLocationModalForm

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)

    def get_context_data(self, **kwargs):
        """Insert the form into the context dict."""
        if 'breadcrumb' not in kwargs:
            kwargs['breadcrumb'] = [
                {'name': 'Tower', 'modal': 'tower_modal'},
                {'name': 'Update'}
            ]
        if 'confirm' not in kwargs:
            kwargs['confirm'] = 'tower_modal'
        return super().get_context_data(**kwargs)


class TowerCreateView(HTMXCreateMixin, CreateView):
    model = workspace_models.AccessPointLocation
    template_name = 'workspace/forms/create.html'
    form_class = workspace_forms.AccessPointLocationModalForm

    def pre_save_form(self, form):
        form.instance.owner = self.request.user
        # Get Session, checking if owned by request user
        form.instance.map_session = (
            workspace_models.WorkspaceMapSession
            .get_rest_queryset(self.request)
            .get(pk=self.kwargs.get('map_session', None))
        )

    def get_form_kwargs(self, *args, **kwargs):
        form_kwargs = super(CreateView, self).get_form_kwargs(*args, **kwargs)
        form_kwargs['initial'].update({'map_session': self.kwargs.get('map_session', None), 'owner': self.request.user})
        return form_kwargs

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)

    def get_context_data(self, **kwargs):
        """Insert the form into the context dict."""
        if 'breadcrumb' not in kwargs:
            kwargs['breadcrumb'] = [
                {'name': 'Tower', 'modal': 'tower_modal'},
                {'name': 'Create'}
            ]
        kwargs['request'] = self.request
        return super().get_context_data(**kwargs)


class SectorDeleteView(HTMXDeleteMixin, DeleteView):
    model = workspace_models.AccessPointSector
    template_name = 'workspace/forms/delete.html'

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)

    def get_context_data(self, **kwargs):
        """Insert the form into the context dict."""
        if 'breadcrumb' not in kwargs:
            kwargs['breadcrumb'] = [
                {'name': 'Tower', 'modal': 'tower_modal'},
                {'name': 'Access Point', 'modal': 'sector_modal'},
                {'name': 'Delete'}
            ]
        if 'confirm' not in kwargs:
            kwargs['confirm'] = 'sector_modal'
        return super().get_context_data(**kwargs)


class SectorUpdateView(HTMXUpdateMixin, UpdateView):
    model = workspace_models.AccessPointSector
    template_name = 'workspace/forms/update.html'
    form_class = workspace_forms.AccessPointSectorModalForm

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)

    def get_context_data(self, **kwargs):
        """Insert the form into the context dict."""
        if 'breadcrumb' not in kwargs:
            kwargs['breadcrumb'] = [
                {'name': 'Tower', 'modal': 'tower_modal'},
                {'name': 'Access Point', 'modal': 'sector_modal'},
                {'name': 'Update'}
            ]
        if 'confirm' not in kwargs:
            kwargs['confirm'] = 'sector_modal'
        return super().get_context_data(**kwargs)


class SectorCreateView(HTMXCreateMixin, CreateView):
    model = workspace_models.AccessPointSector
    template_name = 'workspace/forms/create.html'
    form_class = workspace_forms.AccessPointSectorModalForm

    def pre_save_form(self, form):
        form.instance.owner = self.request.user
        # Get Session, checking if owned by request user
        form.instance.map_session = (
            workspace_models.WorkspaceMapSession
            .get_rest_queryset(self.request)
            .get(pk=self.kwargs.get('map_session', None))
        )
        # Get Tower, checking if owned by request user
        form.instance.ap = (
            workspace_models.AccessPointLocation
            .get_rest_queryset(self.request)
            .get(pk=self.kwargs.get('tower', None))
        )

    def get_form_kwargs(self, *args, **kwargs):
        form_kwargs = super(CreateView, self).get_form_kwargs(*args, **kwargs)
        form_kwargs['initial'].update(
            {
                'map_session': self.kwargs.get('map_session', None),
                'ap': self.kwargs.get('tower', None),
                'owner': self.request.user
            }
        )
        return form_kwargs

    def get_queryset(self):
        return self.model.get_rest_queryset(self.request)

    def get_context_data(self, **kwargs):
        """Insert the form into the context dict."""
        if 'breadcrumb' not in kwargs:
            kwargs['breadcrumb'] = [
                {'name': 'Tower', 'modal': 'tower_modal'},
                {'name': 'Access Point', 'modal': 'sector_modal'},
                {'name': 'Create'}
            ]
        kwargs['request'] = self.request
        return super().get_context_data(**kwargs)
