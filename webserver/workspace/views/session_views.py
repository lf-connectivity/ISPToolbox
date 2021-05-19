from workspace.models import (
    WorkspaceMapSession, WorkspaceMapSessionSerializer
)
from django.views import View
from django.http import HttpResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, get_object_or_404
from rest_framework import generics, mixins, renderers, filters
from workspace import pagination
import json
from uuid import UUID
from workspace.forms import SaveAsSessionForm


class SessionCreateUpdateView(
                        mixins.CreateModelMixin,
                        mixins.UpdateModelMixin,
                        generics.RetrieveAPIView):
    serializer_class = WorkspaceMapSessionSerializer
    lookup_field = 'uuid'

    def post(self, request, *args, **kwargs):
        response = self.create(request, *args, **kwargs)
        if kwargs.get('format') == 'json':
            return response
        return redirect('edit_network', response.data['uuid'], response.data['name'])

    def get_queryset(self):
        user = self.request.user
        return WorkspaceMapSession.objects.filter(owner=user)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class SessionListView(
                    mixins.ListModelMixin,
                    generics.RetrieveAPIView):
    serializer_class = WorkspaceMapSessionSerializer
    template_name = "workspace/molecules/workspace_session_pagination.html"
    renderer_classes = [renderers.TemplateHTMLRenderer, renderers.JSONRenderer]
    pagination_class = pagination.IspToolboxCustomAjaxPagination

    filter_backends = [filters.OrderingFilter]

    ordering_fields = ['name', 'last_updated', 'height', 'max_radius']
    ordering = ['-last_updated']

    def get_queryset(self):
        user = self.request.user
        return WorkspaceMapSession.objects.filter(owner=user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context.update({
            'ordering': self.request.GET.get('ordering', self.ordering[0])
        })
        return context

    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)


class SessionDeleteView(
                    mixins.DestroyModelMixin,
                    generics.RetrieveAPIView):
    serializer_class = WorkspaceMapSessionSerializer
    lookup_field = 'uuid'

    def get_queryset(self):
        user = self.request.user
        return WorkspaceMapSession.objects.filter(owner=user)

    def post(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class SessionDownloadView(LoginRequiredMixin, View):
    def get(self, request, session_uuid=None):
        session = get_object_or_404(WorkspaceMapSession, owner=request.user, uuid=session_uuid)
        geojson = session.get_session_geojson(request)
        geojson_str = json.dumps(geojson, default=lambda x: x.hex if isinstance(x, UUID) else None),
        response = HttpResponse(geojson_str, content_type='csv')
        response['Content-Disposition'] = f'attachment; filename="{session.name}.geojson"'
        return response


class SessionDuplicateRename(LoginRequiredMixin, View):
    def post(self, request):
        saveas_form = SaveAsSessionForm(request.POST)
        if saveas_form.is_valid():
            session = get_object_or_404(WorkspaceMapSession, owner=request.user, uuid=request.POST.get('session'))
            if saveas_form.cleaned_data['create_copy']:
                session = session.duplicate(saveas_form.cleaned_data['name'])
            else:
                session.name = saveas_form.cleaned_data['name']
                session.save()
            return redirect('edit_network', session.uuid, session.name)
