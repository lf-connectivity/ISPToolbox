from django.views import View
from django.shortcuts import render
from django.http import JsonResponse, HttpResponseForbidden
from dataUpdate.models import Source
from django.conf import settings

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


class ASNElasticSearchView(View):
    def validate_auth_header(self, request):
        expected_token = f'Bearer {settings.SOCIAL_AUTH_FACEBOOK_KEY}|{settings.SOCIAL_AUTH_FACEBOOK_SECRET}'
        return request.headers.get('Authorization', None) == expected_token

    def get(self, request):
        if request.user.is_superuser or self.validate_auth_header(request):
            return render(request, 'asn/asn-check.html', {})
        else:
            return HttpResponseForbidden()
    
    def post(self, request):
        return HttpResponseForbidden()