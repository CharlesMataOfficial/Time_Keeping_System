from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.urls import reverse
from .models import CustomUser
from django.views.decorators.cache import never_cache
from .models import TimeEntry
from django.contrib.auth.decorators import login_required


@never_cache
def login_view(request):
    if request.method == "POST":
        employee_id = request.POST.get("employee_id")
        pin = request.POST.get("pin")

        user = CustomUser.authenticate_by_pin(employee_id, pin)

        if user:
            login(request, user)
            if user.is_staff or user.is_superuser:
                return redirect(reverse("admin:index"))
            else:
                return redirect("user_page")
        else:  # Authentication failed
            try:
                CustomUser.objects.get(employee_id=employee_id)
                error_message = "Incorrect PIN"  # Generic message if user exists
            except CustomUser.DoesNotExist:
                error_message = (
                    "Employee ID not found"  # Specific message if user not found
                )

            return render(
                request, "index.html", {"error": error_message}
            )  # Same rendering as before
    return render(request, "index.html")

@login_required
def user_page(request):
    local_now = timezone.localtime(timezone.now())
    today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    todays_entries = TimeEntry.objects.filter(
        time_in__gte=today_start,
        time_in__lt=today_end
    ).order_by('-time_in')

    return render(request, 'user_page.html', {'all_entries': todays_entries})


def logout_view(request):
    logout(request)  # Logs out the user
    return redirect("login")  # Redirects to the login page


import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.utils import timezone
from .models import TimeEntry


@require_POST
def clock_in_view(request):
    data = json.loads(request.body)
    employee_id = data.get("employee_id")
    pin = data.get("pin")

    user = CustomUser.authenticate_by_pin(employee_id, pin)

    if user:
        # Use the clock_in classmethod from TimeEntry to create a new time entry.
        entry = TimeEntry.clock_in(user)
        time_in_formatted = timezone.localtime(entry.time_in).strftime(
            "%I:%M %p, %B %d, %Y"
        )

        # For clock in, time_out is not yet set (so null)
        return JsonResponse(
            {
                "success": True,
                "employee_id": user.employee_id,
                "first_name": user.first_name,
                "surname": user.surname,
                "company": user.company,
                "time_in": time_in_formatted,
                "time_out": None,
            }
        )
    else:
        try:
            CustomUser.objects.get(employee_id=employee_id)
            error_message = "Incorrect PIN"
        except CustomUser.DoesNotExist:
            error_message = "Employee ID not found"
        return JsonResponse(
            {"success": False, "error": error_message}
        )  # Consistent JSON response


@require_POST
def clock_out_view(request):
    data = json.loads(request.body)
    employee_id = data.get("employee_id")
    pin = data.get("pin")

    user = CustomUser.authenticate_by_pin(employee_id, pin)

    if user:
        try:
            # Get the most recent open time entry for the user and clock it out.
            open_entry = TimeEntry.objects.filter(
                user=user, time_out__isnull=True
            ).latest("time_in")
            open_entry.clock_out()

            time_in_formatted = timezone.localtime(open_entry.time_in).strftime(
                "%I:%M %p, %B %d, %Y"
            )
            time_out_formatted = timezone.localtime(open_entry.time_out).strftime(
                "%I:%M %p, %B %d, %Y"
            )

            return JsonResponse(
                {
                    "success": True,
                    "employee_id": user.employee_id,
                    "first_name": user.first_name,
                    "surname": user.surname,
                    "company": user.company,
                    "time_in": time_in_formatted,
                    "time_out": time_out_formatted,
                }
            )
        except TimeEntry.DoesNotExist:
            error_message = "No active clock in found."
        except:
            error_message = "Incorrect PIN"
        return JsonResponse(
            {"success": False, "error": error_message}
        )  # Return error outside try block
    else:
        try:
            CustomUser.objects.get(employee_id=employee_id)
            error_message = "Incorrect PIN"
        except CustomUser.DoesNotExist:
            error_message = "Employee ID not found"
        return JsonResponse(
            {"success": False, "error": error_message}
        )  # Consistent JSON response

from django.views.decorators.http import require_GET
import datetime

@require_GET
@login_required
def get_todays_entries(request):
    user = request.user
    local_now = timezone.localtime(timezone.now())
    today_start = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    entries = TimeEntry.objects.filter(
        user=user, time_in__gte=today_start, time_in__lt=today_end
    ).order_by("-time_in")

    entries_data = []
    for entry in entries:
        entries_data.append(
            {
                "employee_id": user.employee_id,
                "first_name": user.first_name,
                "surname": user.surname,
                "company": user.company,
                "time_in": timezone.localtime(entry.time_in).strftime(
                    "%I:%M %p, %B %d, %Y"
                ),
                "time_out": (
                    timezone.localtime(entry.time_out).strftime("%I:%M %p, %B %d, %Y")
                    if entry.time_out
                    else None
                ),
            }
        )

    return JsonResponse({"entries": entries_data})
