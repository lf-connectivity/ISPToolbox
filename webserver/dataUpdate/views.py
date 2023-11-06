# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.http.response import Http404
from django.views import View
from django.shortcuts import render
from django.http import JsonResponse
from dataUpdate.models import Source
from django.core.cache import cache
from dataUpdate.scripts.load_asn_elasticsearch import queryASNElasticCache
from dataUpdate.scripts.rdap_utils import RDAP_ASNs, RDAPRequest
from workspace.utils.api_validate_request import validate_auth_header


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
    def get(self, request):
        if request.user.is_superuser or validate_auth_header(request):
            query = request.GET.get('query', None)
            context = {'error': None, 'query': query,
                       'results': None, 'cached': 'True'}
            if query is not None:
                try:
                    key = 'asn-es-' + query
                    result = cache.get(key)
                    if result is None:
                        result = queryASNElasticCache(query)
                        context.update({'cached': 'False'})
                        # cache result for 1 day
                        cache.set(key, result, 60 * 60 * 24)
                    context.update({
                        'results': result
                    })
                except Exception:
                    context.update({
                        'error': 'An Error Occured'
                    })
            if request.GET.get('format', None) == 'json':
                return JsonResponse(context)
            return render(request, 'asn/asn-check.html', context)
        else:
            raise Http404


class RDAPQueryView(View):
    def get(self, request):
        if request.user.is_superuser or validate_auth_header(request):
            ip = request.GET.get('ip', None)
            if ip is not None:
                rdap_resp = RDAPRequest(ip)
                asns = RDAP_ASNs(rdap_resp)
                return JsonResponse({'asn': asns})
            else:
                return JsonResponse({})
        else:
            raise Http404
