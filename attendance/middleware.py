from django.shortcuts import redirect
from django.urls import reverse


class BlockAdminAccessMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if the user is trying to access the admin page
        if request.path.startswith("/admin"):

            # Allow access if the user is an authenticated staff or superuser
            if request.user.is_authenticated and (
                request.user.is_staff or request.user.is_superuser
            ):
                return self.get_response(request)

            # Otherwise, redirect to the login page
            return redirect(
                reverse("login")
            )  # Adjust 'login' to your actual login page name

        return self.get_response(request)
