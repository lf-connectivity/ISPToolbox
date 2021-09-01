from django.views import View
from workspace.models import AccessPointLocation, CPELocation
from django.http import Http404, JsonResponse
from workspace.utils.visualization_meta import get_workspace_potree_visualization_metadata


class PotreeVisualizationMetaView(View):
    """
    This view returns the metadata necessary to render network asset in Potree
    """

    def get(self, request, feature):
        for model in [AccessPointLocation, CPELocation]:
            try:
                asset = model.objects.get(pk=feature)
                return JsonResponse(get_workspace_potree_visualization_metadata(asset))
            except model.objects.model.DoesNotExist:
                pass
            except Exception:
                pass
        raise Http404
