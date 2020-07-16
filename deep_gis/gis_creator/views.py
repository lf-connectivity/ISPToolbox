from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse, JsonResponse

def index(request):
    # Get Area of Interest From Client
    geojson = request.GET.get('geojson','{}')
    # Create Async Task through Celery and Respond with the Task ID
    return HttpResponse('<h1>nice to meme you</h1><h2>{}</h2>'.format(geojson))