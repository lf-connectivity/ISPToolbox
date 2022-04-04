from django.shortcuts import render
from django.views.generic.edit import DeleteView, UpdateView
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
        return super().get_context_data(**kwargs)
