# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.contrib import admin
from dataUpdate.models import Source
from dataUpdate.tasks import updateCCData, updateMlabData, updateCbrsData


# Dict of update functions as celery tasks (with @app.task annotation)
UPDATE_FN = {
    'CBRS': updateCbrsData,
    'MLAB': updateMlabData,
    'NON_URBAN_OVERLAY': updateCCData,
}


# Puts update function on to the celery task queue to be executed if available
def update_selected(modeladmin, request, queryset):
    # Get a set of unique ids to attempt updates for
    uniqueUpdateIds = set(map(lambda source: source.source_id, queryset))
    for updateId in uniqueUpdateIds:
        if updateId in UPDATE_FN:
            UPDATE_FN[updateId].delay()


update_selected.short_description = 'Update selected sources if available'


class SourceAdmin(admin.ModelAdmin):
    list_display = ('source_id', 'source_country', 'last_updated')
    actions = [update_selected]


admin.site.register(Source, SourceAdmin)
