from django.shortcuts import render
from django.views import View


class DefaultWorkspaceView(View):
    def get(self, request):
        return render(request, 'workspace/pages/default.html', {})
