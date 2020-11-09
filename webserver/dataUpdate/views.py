from django.views import View
from django.http import JsonResponse
from dataUpdate.models import Source


class CountrySourceUpdatedView(View):
    def get(self, request):
        """
            Returns a list of json objects representing last updated dates for sources.
        """
        country = request.GET.get("country", "")
        if not country:
            return JsonResponse({"error": "Country not found"})
        sources = Source.objects.filter(source_country=country)
        resp = list(
            map(
                lambda s: {
                    "id": s.source_id,
                    "month": s.last_updated.strftime("%b"),
                    "year": str(s.last_updated.year),
                },
                sources,
            )
        )
        return JsonResponse(resp, safe=False)
