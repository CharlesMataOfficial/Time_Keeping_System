from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.urls import reverse
from .models import CustomUser, TimeEntry
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
import datetime
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone


@never_cache
def login_view(request):
    if request.method == "POST":
        employee_id = request.POST.get("employee_id")
        pin = request.POST.get("pin")

        user = CustomUser.authenticate_by_pin(employee_id, pin)

        if user:
            login(request, user)
            if user.is_staff and user.is_superuser:
                return redirect(reverse("admin:index"))
            elif user.is_staff and not user.is_superuser:
                return redirect(
                    "custom_admin_page"
                )  # Redirect to custom admin page (you need to set this URL)
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

            return render(request, "index.html", {"error": error_message})
    return render(request, "index.html")


@login_required
def user_page(request):
    # Since USE_TZ is False, timezone.now() returns a naive datetime in local time.
    user_company = request.user.company.strip().lower()

    #company logo mapping from fetched data to image path.
    company_logo_mapping = {
        "sfgc": "SFgroup.png",
        "asc": "agrilogo2.png",  
        "sfgci": "SFgroup.png", 
        "smi": "sunfood.png",
        "gti": "Geniustech.png",  
        "fac": "farmtech.png", 
        "djas": "DJas.png",   
        "default": "default_logo.png", 
    }
    # Get the company logo based on the user's company
    company_logo = company_logo_mapping.get(
        user_company, company_logo_mapping["default"]
    )

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    # Filter entries for today based on the naive datetimes.
    todays_entries = TimeEntry.objects.filter(
        time_in__gte=today_start, time_in__lt=today_end
    ).order_by("-time_in")

    return render(
        request,
        "user_page.html",
        {
            "all_entries": todays_entries,
            "partner_logo": company_logo,
            "user_company": user_company,
        },
    )


def logout_view(request):
    logout(request)
    return redirect("login")


@require_POST
def clock_in_view(request):
    data = json.loads(request.body)
    employee_id = data.get("employee_id")
    pin = data.get("pin")

    user = CustomUser.authenticate_by_pin(employee_id, pin)

    if user:
        # Create a new clock-in entry using the model’s clock_in method.
        entry = TimeEntry.clock_in(user)
        # Format the time using the naive datetime (local time).
        time_in_formatted = entry.time_in.strftime("%I:%M %p, %B %d, %Y")
        

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
        return JsonResponse({"success": False, "error": error_message})


@require_POST
def clock_out_view(request):
    data = json.loads(request.body)
    employee_id = data.get("employee_id")
    pin = data.get("pin")

    user = CustomUser.authenticate_by_pin(employee_id, pin)

    if user:
        try:
            now = timezone.now()  # Naive datetime in local time
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + datetime.timedelta(days=1)

            open_entry = TimeEntry.objects.filter(
                user=user,
                time_out__isnull=True,
                time_in__gte=today_start,
                time_in__lt=today_end,
            ).latest("time_in")

            open_entry.clock_out()

            time_in_formatted = open_entry.time_in.strftime("%I:%M %p, %B %d, %Y")
            time_out_formatted = open_entry.time_out.strftime("%I:%M %p, %B %d, %Y")

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
        except Exception as e:
            error_message = f"An error occurred: {str(e)}"
        return JsonResponse({"success": False, "error": error_message})
    else:
        try:
            CustomUser.objects.get(employee_id=employee_id)
            error_message = "Incorrect PIN"
        except CustomUser.DoesNotExist:
            error_message = "Employee ID not found"
        return JsonResponse({"success": False, "error": error_message})


@require_GET
@login_required
def get_todays_entries(request):
    now = timezone.now()  # Naive datetime in local time.
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    entries = TimeEntry.objects.filter(
        time_in__gte=today_start, time_in__lt=today_end
    ).order_by("-last_modified")

    entries_data = []
    for entry in entries:
        entries_data.append(
            {
                "employee_id": entry.user.employee_id,
                "first_name": entry.user.first_name,
                "surname": entry.user.surname,
                "company": entry.user.company,
                "time_in": entry.time_in.strftime("%I:%M %p, %B %d, %Y"),
                "time_out": (
                    entry.time_out.strftime("%I:%M %p, %B %d, %Y")
                    if entry.time_out
                    else None
                ),
            }
        )

    return JsonResponse({"entries": entries_data})


def custom_admin_page(request):
    # Check if the user is staff but not a superuser (admin page access logic)
    if not request.user.is_staff or request.user.is_superuser:
        return redirect("user_page")  # Redirect non-admin users elsewhere

    # If the user is staff and not a superuser, show the custom admin page
    return render(request, "custom_admin_page.html")
