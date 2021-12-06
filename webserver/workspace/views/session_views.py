from django.http.response import JsonResponse
from workspace.models import (
    WorkspaceMapSession, WorkspaceMapSessionSerializer
)
from django.urls import reverse
from django.views import View
from django.http import HttpResponse
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, get_object_or_404
from rest_framework import generics, mixins, renderers, filters
from workspace import pagination
import json
import logging
from uuid import UUID
from workspace.forms import SaveAsSessionForm
from django.db.utils import IntegrityError
from rest_framework.permissions import AllowAny


class SessionCreateUpdateView(
        mixins.CreateModelMixin,
        mixins.UpdateModelMixin,
        generics.RetrieveAPIView):
    serializer_class = WorkspaceMapSessionSerializer
    lookup_field = 'uuid'
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        response = self.create(request, *args, **kwargs)
        if request.query_params.get('format') == 'json':
            return response
        return redirect('workspace:edit_network', response.data['uuid'], response.data['name'])

    def get_queryset(self):
        return WorkspaceMapSession.get_rest_queryset(self.request)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = None if self.request.user.is_anonymous else self.request.user
        session = (
            self.request.session.session_key
            if self.request.session is not None else None
        )
        serializer.save(owner=user, session_id=session)


class SessionListView(
        mixins.ListModelMixin,
        generics.RetrieveAPIView):
    serializer_class = WorkspaceMapSessionSerializer
    template_name = "workspace/molecules/workspace_session_pagination.html"
    renderer_classes = [renderers.TemplateHTMLRenderer, renderers.JSONRenderer]
    pagination_class = pagination.IspToolboxCustomAjaxPagination
    permission_classes = [AllowAny]

    filter_backends = [filters.OrderingFilter]

    ordering_fields = ['name', 'last_updated', 'number_of_towers']
    ordering = ['-last_updated']

    def get_queryset(self):
        return WorkspaceMapSession.get_rest_queryset(self.request)

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
    permission_classes = [AllowAny]

    def get_queryset(self):
        return WorkspaceMapSession.get_rest_queryset(self.request)

    def post(self, request, *args, **kwargs):
        return self.destroy(request, *args, **kwargs)


class SessionDownloadGeoJSONView(LoginRequiredMixin, View):
    def get(self, request, session_uuid=None):
        session = get_object_or_404(
            WorkspaceMapSession, owner=request.user, uuid=session_uuid)
        geojson = session.get_session_geojson()
        geojson_str = json.dumps(
            geojson, default=lambda x: x.hex if isinstance(x, UUID) else None)
        response = HttpResponse(geojson_str, content_type='csv')
        response['Content-Disposition'] = f'attachment; filename="{session.name}.geojson"'
        return response


class SessionDownloadKMZView(LoginRequiredMixin, View):
    def get(self, request, session_uuid=None):
        session = get_object_or_404(
            WorkspaceMapSession, owner=request.user, uuid=session_uuid)
        kml = session.get_session_kml()
        response = HttpResponse(kml, content_type='csv')
        response['Content-Disposition'] = f'attachment; filename="{session.name}.kml"'
        return response


class SessionSaveAsView(LoginRequiredMixin, View):
    def post(self, request):
        saveas_form = SaveAsSessionForm(request.POST)
        if saveas_form.is_valid():
            session = get_object_or_404(
                WorkspaceMapSession, owner=request.user, uuid=request.POST.get('session'))
            try:
                session = session.duplicate(
                    saveas_form.cleaned_data['save_as_session_name'])
                return JsonResponse({'url': reverse('workspace:edit_network', args=[session.uuid, session.name])})
            except IntegrityError:
                return JsonResponse({'error': WorkspaceMapSession.UNIQUE_TOGETHER_ERROR}, status=400)
            except Exception as unknown_error:
                logging.error(str(unknown_error))
                return JsonResponse({'error': 'Unknown Error Occured'}, status=400)
