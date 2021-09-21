from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View
from workspace.models import AccessPointLocation, CPELocation, APToCPELink
from django.http import Http404, JsonResponse
from workspace.utils.visualization_meta import get_workspace_potree_visualization_metadata


class PotreeVisualizationMetaView(LoginRequiredMixin, View):
    """
    This view returns the metadata necessary to render network asset in Potree
    """

    def get(self, request, feature):
        for model in [AccessPointLocation, CPELocation, APToCPELink]:
            try:
                asset = model.get_rest_queryset(request).get(pk=feature)
                metadata = get_workspace_potree_visualization_metadata(asset)
                metadata.update({'uuid': feature})
                return JsonResponse(metadata)
            except model.objects.model.DoesNotExist:
                pass
            except Exception:
                pass
        raise Http404
