from django.contrib.auth.mixins import UserPassesTestMixin


class SuperuserRequiredMixin(UserPassesTestMixin):
    def test_func(self):
        return self.request.user.is_superuser


class WorkspacePerformCreateMixin:
    """
    Mixin for REST Views to create new workspace models with foreign keys to the
    reuqest session or request user
    """

    def perform_create(self, serializer):
        session = None
        if self.request.session and self.request.session.session_key is not None:
            session = self.request.session.session_key
        user = self.request.user
        if self.request.user.is_anonymous:
            user = None
        serializer.save(owner=user, session_id=session)


class WorkspaceAPIPerformCreateMixin:
    """
    Mixin for REST API Views to create new workspace models with foreign keys to 
    the request user
    """
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class WorkspaceFeatureGetQuerySetMixin:
    """
    Mixin for REST Views to get the appropriate query set for the model
    using the request's user or session
    """

    def get_queryset(self):
        model = self.serializer_class.Meta.model
        return model.get_rest_queryset(self.request)
