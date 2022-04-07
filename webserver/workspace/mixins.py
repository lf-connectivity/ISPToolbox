from django.contrib.auth.mixins import UserPassesTestMixin


class SuperuserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser


class WorkspaceFeatureGetQuerySetMixin:
    """
    Mixin for REST Views to get the appropriate query set for the model
    using the request's user or session
    """

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)
