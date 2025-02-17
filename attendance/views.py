from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.urls import reverse
from .models import CustomUser, TimeEntry
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
from datetime import datetime, timedelta


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
    # Get company with fallback to empty string if None
    user_company = request.user.company or ""
    user_company = user_company.strip().lower()

    # Company logo mapping from fetched data to image path
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
    today_end = today_start + timedelta(days=1)

    # Filter entries for today based on the naive datetimes
    todays_entries = TimeEntry.objects.filter(
        time_in__gte=today_start, time_in__lt=today_end
    ).order_by("-last_modified")

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
    new_pin = data.get("new_pin")
    image_path = data.get("image_path")
    first_login_check = data.get("first_login_check", False)

    auth_result = CustomUser.authenticate_by_pin(employee_id, pin)

    # Handle first login cases
    if isinstance(auth_result, dict) and auth_result["status"] == "first_login":
        if new_pin:
            # Update PIN for first time login
            user = auth_result["user"]
            user.pin = new_pin
            user.if_first_login = False
            user.save()
            return JsonResponse({
                "success": True,
                "message": "PIN updated successfully"
            })
        else:
            # Prompt for new PIN
            return JsonResponse({
                "success": False,
                "error": "first_login",
                "message": "Please set your new PIN"
            })

    # For first login check only
    if first_login_check:
        if isinstance(auth_result, dict) and auth_result["status"] == "first_login":
            return JsonResponse({
                "success": False,
                "error": "first_login",
                "message": "Please set your new PIN"
            })
        return JsonResponse({"success": True})

    # Regular clock in
    if not isinstance(auth_result, dict) and auth_result:
        user = auth_result
        # Rest of your clock in logic...

        if not user:
            try:
                CustomUser.objects.get(employee_id=employee_id)
                error_message = "Incorrect PIN"
            except CustomUser.DoesNotExist:
                error_message = "Employee ID not found"
            return JsonResponse({"success": False, "error": error_message})

        # Handle company logo
        user_company = user.company or ""  # Handle None case
        user_company = user_company.strip().lower()

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

        company_logo = company_logo_mapping.get(
            user_company, company_logo_mapping["default"]
        )

        # Create time entry
        entry = TimeEntry.clock_in(user)
        if image_path:
            entry.image_path = image_path
            entry.save()

        return JsonResponse({
            "success": True,
            "employee_id": user.employee_id,
            "first_name": user.first_name,
            "surname": user.surname,
            "company": user.company or "",  # Handle None case
            "time_in": entry.time_in.strftime("%I:%M %p, %B %d, %Y"),
            "time_out": None,
            "image_path": entry.image_path,
            "new_logo": company_logo,
        })


@require_POST
def clock_out_view(request):
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

    data = json.loads(request.body)
    employee_id = data.get("employee_id")
    pin = data.get("pin")

    user = CustomUser.authenticate_by_pin(employee_id, pin)

    if user:
        try:
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)

            open_entry = TimeEntry.objects.filter(
                user=user,
                time_out__isnull=True,
                time_in__gte=today_start,
                time_in__lt=today_end,
            ).latest("time_in")

            open_entry.clock_out()

            time_in_formatted = open_entry.time_in.strftime("%I:%M %p, %B %d, %Y")
            time_out_formatted = open_entry.time_out.strftime("%I:%M %p, %B %d, %Y")

            # Handle None company value
            user_company = user.company or ""
            user_company = user_company.strip().lower()

            # Get the company logo based on the user's company
            company_logo = company_logo_mapping.get(
                user_company, company_logo_mapping["default"]
            )

            return JsonResponse({
                "success": True,
                "employee_id": user.employee_id,
                "first_name": user.first_name or "",
                "surname": user.surname or "",
                "company": user.company or "",
                "time_in": time_in_formatted,
                "time_out": time_out_formatted,
                "new_logo": company_logo,
            })
        except TimeEntry.DoesNotExist:
            return JsonResponse({
                "success": False,
                "error": "No active clock in found."
            })
        except Exception as e:
            return JsonResponse({
                "success": False,
                "error": f"An error occurred: {str(e)}"
            })
    else:
        try:
            CustomUser.objects.get(employee_id=employee_id)
            error_message = "Incorrect PIN"
        except CustomUser.DoesNotExist:
            error_message = "Employee ID not found"
        return JsonResponse({
            "success": False,
            "error": error_message
        })


@require_GET
@login_required
def get_todays_entries(request):
    now = timezone.now()  # Naive datetime in local time.
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

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


@require_POST
def upload_image(request):
    image_data = request.FILES.get("image")
    employee_id = request.POST.get("employee_id")

    if image_data:
        try:
            user = CustomUser.objects.get(employee_id=employee_id)
        except CustomUser.DoesNotExist:
            return JsonResponse({"success": False, "error": "User not found"})

        # Get the current date
        now = datetime.now()
        year = now.strftime("%Y")
        month = now.strftime("%m")
        day = now.strftime("%d")
        timestamp = now.strftime("%H%M%S")

        # Create directories based on the current date
        directory = os.path.join("attendance_images", year, month, day)
        if not os.path.exists(directory):
            os.makedirs(directory)

        # Create a unique file name
        file_name = (
            f"{timestamp}_{user.employee_id}_{user.surname}{user.first_name}.jpg"
        )
        file_path = os.path.join(directory, file_name)

        # Save the file
        file_path = default_storage.save(file_path, ContentFile(image_data.read()))
        return JsonResponse({"success": True, "file_path": file_path})
    return JsonResponse({"success": False, "error": "No image uploaded"})
