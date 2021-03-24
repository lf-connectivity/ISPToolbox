from rest_framework import pagination
from rest_framework.response import Response


class IspToolboxCustomAjaxPagination(pagination.PageNumberPagination):
    def get_paginated_response(self, data):
        return Response({
            'next': None if not self.page.has_next() else self.page.next_page_number(),
            'current': self.page.number,
            'previous': None if not self.page.has_previous() else self.page.previous_page_number(),
            'count': self.page.paginator.count,
            'offset': self.page.start_index(),
            'results': data,
        })
