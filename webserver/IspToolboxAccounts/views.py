# (c) Meta Platforms, Inc. and affiliates. Copyright
from django.contrib.auth import login, authenticate
from django.contrib.gis.geos.point import Point
from django.urls.base import reverse
from django.views import View
from IspToolboxAccounts.forms import (
    IspToolboxUserCreationForm,
    IspToolboxUserCreationAdminForm,
)
from IspToolboxAccounts.models import User, NewUserExperience
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import redirect, render
from django.conf import settings
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.http import Http404, JsonResponse
from IspToolboxAccounts.utils import enable_account_creation
from workspace import models as workspace_models
from workspace.mixins import SuperuserRequiredMixin
import json
import secrets


ISPT_REGISTRATION_CODE = "isptoolbox usability testing"


class CreateAccountView(View):
    def post(self, request):
        form = IspToolboxUserCreationForm(request.POST)
        if form.is_valid() and (
            enable_account_creation()
            or (form.cleaned_data.get("registration_code") == ISPT_REGISTRATION_CODE)
        ):
            form.save()
            username = form.cleaned_data.get("email")
            raw_password = form.cleaned_data.get("password1")
            user = authenticate(username=username, password=raw_password)
            login(request, user, backend=settings.AUTHENTICATION_BACKENDS[0])
            next_url = request.POST.get("next", request.GET.get("next", None))
            url_is_safe = url_has_allowed_host_and_scheme(
                url=next_url,
                allowed_hosts=self.request.get_host(),
                require_https=self.request.is_secure(),
            )
            if next_url is not None and url_is_safe:
                return redirect(
                    reverse("workspace:optional_info") + f"?next={next_url}"
                )
            else:
                return redirect(reverse("workspace:optional_info"))
        return render(
            request,
            "workspace/pages/login_view.html",
            {
                "showSignUp": True,
                "showEmailSignUp": True,
                "authentication_form": AuthenticationForm,
                "sign_up_form": form,
            },
        )

    def get(self, request):
        return redirect("workspace:workspace_dashboard")


@method_decorator(csrf_exempt, name="dispatch")
class IntegrationTestAccountLoginView(View):
    TEST_AP = {"coordinates": [-86.58242848006918, 36.808415845040415], "type": "Point"}

    TEST_CPE = {"coordinates": [-86.58538341719195, 36.80738720733433], "type": "Point"}

    TEST_AP = json.dumps(TEST_AP)
    TEST_CPE = json.dumps(TEST_CPE)

    @classmethod
    def createAccount(cls, request):
        if settings.PROD:
            return None
        else:
            if User.objects.filter(email="test-isp@fb.com").exists():
                User.objects.get(email="test-isp@fb.com").delete()
            if User.objects.filter(email="test-user-isp@fb.com").exists():
                User.objects.get(email="test-user-isp@fb.com").delete()
            login_user = User.objects.create_user(
                email="test-user-isp@fb.com",
                first_name="TestUser",
                last_name="ISPToolbox",
                password="zuuuuccccCCCC1",
            )
            login_user.save()

            # Create dummy session
            session = workspace_models.WorkspaceMapSession(owner=login_user)
            session.save()
            session.name = "Test Workspace"
            session.center = Point(-86.5817861024335, 36.80733577508586)
            session.zoom = 15.74
            session.save()

            # Create dummy AP/CPE
            ap = workspace_models.AccessPointLocation(
                name="Test AP",
                owner=login_user,
                map_session=session,
                geojson=cls.TEST_AP,
                max_radius=0.5,
            )
            ap.save()

            cpe = workspace_models.CPELocation(
                name="123 Test Ave",
                owner=login_user,
                map_session=session,
                geojson=cls.TEST_CPE,
                ap=ap,
            )
            cpe.save()

            link = workspace_models.APToCPELink(
                ap=ap, cpe=cpe, owner=login_user, map_session=session
            )
            link.save()
            return login_user

    def post(self, request):
        if settings.PROD:
            raise Http404
        else:
            user = IntegrationTestAccountLoginView.createAccount(request)
            login(request, user, backend=settings.AUTHENTICATION_BACKENDS[0])
            return JsonResponse({"success": True})


@method_decorator(csrf_exempt, name="dispatch")
class IntegrationTestAccountCreationView(View):
    def post(self, request):
        if settings.PROD:
            raise Http404
        else:
            IntegrationTestAccountLoginView.createAccount(request)
            return JsonResponse({"success": True})

    def get(self, request):
        raise Http404


class UpdateNuxSettingView(SuperuserRequiredMixin, View):
    def post(self, request):
        try:
            nux = NewUserExperience.objects.get(id=request.POST.get("nux"))
        except Exception:
            raise Http404
        if request.POST.get("seen"):
            nux.users.add(request.POST.get("user"))
        else:
            nux.users.remove(request.POST.get("user"))
        return redirect(request.POST.get("next"))


class CreateNewUserAccount(SuperuserRequiredMixin, View):
    """
    This view is used by Admins to create users for usability testing
    """

    def get(self, request):
        form = IspToolboxUserCreationAdminForm()
        return render(
            request, "admin/pages/create_new_account.html", context={"form": form}
        )

    def post(self, request):
        post = request.POST.copy()
        random_password = secrets.token_urlsafe(10)
        post.update(
            {
                "password1": random_password,
                "password2": random_password,
                "registration_code": ISPT_REGISTRATION_CODE,
            }
        )
        form = IspToolboxUserCreationForm(post)
        created = False
        if form.is_valid():
            form.save()
            created = True
        return render(
            request,
            "admin/pages/create_new_account.html",
            context={
                "created": created,
                "password": random_password,
                "form": IspToolboxUserCreationAdminForm(request.POST),
            },
        )
