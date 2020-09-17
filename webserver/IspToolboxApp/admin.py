from django.contrib import admin

# Register your models here.
from IspToolboxApp.Models.MarketEvaluatorModels import MarketEvaluatorPipeline
from IspToolboxApp.Models.MarketingModels import MarketingAudience, MarketingAccount

admin.site.register(MarketEvaluatorPipeline)
admin.site.register(MarketingAudience)
admin.site.register(MarketingAccount)
