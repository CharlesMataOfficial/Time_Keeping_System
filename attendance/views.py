from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.urls import reverse
from .models import CustomUser, TimeEntry, Announcement
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
import json
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.http import require_POST, require_GET
from django.utils import timezone
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import os
from datetime import datetime, timedelta
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from .models import CustomUser
from django.db.models import Q

@never_cache
def login_view(request):
    if request.method == "POST":
        employee_id = request.POST.get("employee_id")
        pin = request.POST.get("pin")

        try:
            # First check if user exists and is active
            user = CustomUser.objects.get(employee_id=employee_id)

            if not user.is_active:
                return render(request, "login_page.html",
                            {"error": "This account is inactive"})

            # Try to authenticate
            auth_result = CustomUser.authenticate_by_pin(employee_id, pin)

            if auth_result:  # Successful login
                user = auth_result if isinstance(auth_result, CustomUser) else auth_result["user"]
                login(request, user)

                if user.is_guard:
                    return redirect("user_page")
                elif user.is_staff or user.is_superuser:
                    return redirect("custom_admin_page")
                else:
                    return render(request, "login_page.html",
                                {"error": "You do not have permission to log in"})
            else:
                return render(request, "login_page.html",
                            {"error": "Incorrect PIN"})

        except CustomUser.DoesNotExist:
            return render(request, "login_page.html",
                        {"error": "Employee ID not found"})

    return render(request, "login_page.html")


@login_required
def user_page(request):
    # Force a refresh from the DB so that the latest value of is_guard is loaded
    request.user.refresh_from_db()
    print(
        "USER_PAGE VIEW: request.user:",
        request.user,
        "is_guard:",
        request.user.is_guard,
    )

    if not request.user.is_guard:
        messages.error(
            request, "Access denied. You do not have permission to access this page."
        )
        return redirect("custom_admin_page")

    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    todays_entries = TimeEntry.objects.filter(
        time_in__gte=today_start, time_in__lt=today_end
    ).order_by("-last_modified")

    return render(
        request,
        "user_page.html",
        {
            "all_entries": todays_entries,
            "partner_logo": "default_logo.png",
            "user_company": "",
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
            return JsonResponse(
                {"success": True, "message": "PIN updated successfully"}
            )
        else:
            # Prompt for new PIN
            return JsonResponse(
                {
                    "success": False,
                    "error": "first_login",
                    "message": "Please set your new PIN",
                }
            )

    # For first login check only
    if first_login_check:
        if isinstance(auth_result, dict) and auth_result["status"] == "first_login":
            return JsonResponse(
                {
                    "success": False,
                    "error": "first_login",
                    "message": "Please set your new PIN",
                }
            )
        return JsonResponse({"success": True})

    if not isinstance(auth_result, dict) and auth_result:
        user = auth_result

        if not user:
            try:
                CustomUser.objects.get(employee_id=employee_id)
                error_message = "Incorrect PIN"
            except CustomUser.DoesNotExist:
                error_message = "Employee ID not found"
            return JsonResponse({"success": False, "error": error_message})

        # Handle company logo
        user_company = user.company.name if user.company else ""  # Handle None case
        user_company = user_company.strip().lower()

        company_logo_mapping = {
            "sfgc": "sfgroup.png",
            "asc": "agridom4.png",
            "sfgci": "sfgroup.png",
            "smi": "sunfood.png",
            "gti": "geniustech.png",
            "fac": "farmtech.png",
            "djas": "djas.png",
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

        # Fetch updated attendance list
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        todays_entries = TimeEntry.objects.filter(
            time_in__gte=today_start, time_in__lt=today_end
        ).order_by("-last_modified")

        attendance_list = [
            {
                "employee_id": entry.user.employee_id,
                "first_name": entry.user.first_name,
                "surname": entry.user.surname,
                "company": entry.user.company.name if entry.user.company else "",
                "time_in": entry.time_in.strftime("%I:%M %p"),
                "time_out": (
                    entry.time_out.strftime("%I:%M %p") if entry.time_out else None
                ),
                "image_path": entry.image_path,
            }
            for entry in todays_entries
        ]

        return JsonResponse(
            {
                "success": True,
                "employee_id": user.employee_id,
                "first_name": user.first_name,
                "surname": user.surname,
                "company": user.company.name if user.company else "",
                "time_in": entry.time_in.strftime("%I:%M %p"),
                "time_out": None,
                "image_path": entry.image_path,
                "new_logo": company_logo,
                "attendance_list": attendance_list,
            }
        )

@require_POST
def clock_out_view(request):
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

            time_in_formatted = open_entry.time_in.strftime("%I:%M %p")
            time_out_formatted = open_entry.time_out.strftime("%I:%M %p")

            # Handle None company value
            user_company = user.company.name if user.company else ""
            user_company = user_company.strip().lower()

            # Get the company logo based on the user's company
            company_logo_mapping = {
                "sfgc": "sfgroup.png",
                "asc": "agridom4.png",
                "sfgci": "sfgroup.png",
                "smi": "sunfood.png",
                "gti": "geniustech.png",
                "fac": "farmtech.png",
                "djas": "djas.png",
                "default": "default_logo.png",
            }

            company_logo = company_logo_mapping.get(
                user_company, company_logo_mapping["default"]
            )

            # Fetch updated attendance list
            todays_entries = TimeEntry.objects.filter(
                time_in__gte=today_start, time_in__lt=today_end
            ).order_by("-last_modified")

            attendance_list = [
                {
                    "employee_id": entry.user.employee_id,
                    "first_name": entry.user.first_name,
                    "surname": entry.user.surname,
                    "company": entry.user.company.name if entry.user.company else "",
                    "time_in": entry.time_in.strftime("%I:%M %p"),
                    "time_out": (
                        entry.time_out.strftime("%I:%M %p") if entry.time_out else None
                    ),
                    "image_path": entry.image_path,
                }
                for entry in todays_entries
            ]

            return JsonResponse(
                {
                    "success": True,
                    "employee_id": user.employee_id,
                    "first_name": user.first_name or "",
                    "surname": user.surname or "",
                    "company": user.company.name if user.company else "",
                    "time_in": time_in_formatted,
                    "time_out": time_out_formatted,
                    "new_logo": company_logo,
                    "attendance_list": attendance_list,
                }
            )
        except TimeEntry.DoesNotExist:
            return JsonResponse(
                {"success": False, "error": "No active clock in found."}
            )
        except Exception as e:
            return JsonResponse(
                {"success": False, "error": f"An error occurred: {str(e)}"}
            )
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
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    # Make sure entries are ordered by last_modified in descending order
    entries = TimeEntry.objects.filter(
        time_in__gte=today_start, time_in__lt=today_end
    ).order_by(
        "-last_modified"
    )  # This is correct

    entries_data = []
    for entry in entries:
        entries_data.append(
            {
                "employee_id": entry.user.employee_id,
                "first_name": entry.user.first_name,
                "surname": entry.user.surname,
                "company": entry.user.company.name if entry.user.company else "",
                "time_in": entry.time_in.strftime("%I:%M %p"),
                "time_out": (
                    entry.time_out.strftime("%I:%M %p") if entry.time_out else None
                ),
            }
        )

    return JsonResponse({"entries": entries_data})


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


@csrf_exempt
def announcements_list_create(request):
    """
    GET  -> Return a list of all announcements (JSON)
    POST -> Create a new announcement (expects JSON body { content: "..."} )
    """
    if request.method == "GET":
        announcements = Announcement.objects.all().order_by("-created_at")
        data = [
            {
                "id": ann.id,
                "content": ann.content,
                "created_at": ann.created_at.isoformat(),
                "is_posted": ann.is_posted,
            }
            for ann in announcements
        ]
        return JsonResponse(data, safe=False)

    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            content = body.get("content", "")
            announcement = Announcement.objects.create(content=content)
            return JsonResponse(
                {"message": "Announcement created", "id": announcement.id}
            )
        except:
            return HttpResponseBadRequest("Invalid data")

    return HttpResponseBadRequest("Unsupported method")


@csrf_exempt
def announcement_detail(request, pk):
    """
    GET -> Return details of a single announcement by ID.
    """
    announcement = get_object_or_404(Announcement, pk=pk)

    if request.method == "GET":
        data = {
            "id": announcement.id,
            "content": announcement.content,
            "created_at": announcement.created_at.isoformat(),
            "is_posted": announcement.is_posted,
        }
        return JsonResponse(data)

    return HttpResponseBadRequest("Unsupported method")


@csrf_exempt
def announcement_delete(request, pk):
    """
    DELETE -> Delete an announcement by ID.
    """
    if request.method == "DELETE":
        announcement = get_object_or_404(Announcement, pk=pk)
        announcement.delete()
        return JsonResponse({"message": "Announcement deleted"})
    return HttpResponseBadRequest("Unsupported method")


@csrf_exempt
def announcement_post(request, pk):
    """
    POST -> Mark an announcement as posted (is_posted = True).
    """
    if request.method == "POST":
        announcement = get_object_or_404(Announcement, pk=pk)
        announcement.is_posted = True
        announcement.save()
        return JsonResponse({"message": "Announcement posted"})
    return HttpResponseBadRequest("Unsupported method")


@csrf_exempt
def posted_announcements_list(request):
    """
    GET -> Return a list of posted announcements (is_posted=True).
    """
    if request.method == "GET":
        # Filter to only posted announcements
        announcements = Announcement.objects.filter(is_posted=True).order_by(
            "-created_at"
        )
        data = [
            {
                "id": ann.id,
                "content": ann.content,
                "created_at": ann.created_at.isoformat(),
                "is_posted": ann.is_posted,
            }
            for ann in announcements
        ]
        return JsonResponse(data, safe=False)

    return HttpResponseBadRequest("Unsupported method")


def custom_admin_page(request):
    # Only allow users that are staff or superusers to access this page.
    if not (request.user.is_staff or request.user.is_superuser):
        # Redirect non-admin users to the regular user page (or another page)
        return redirect("user_page")

    # Otherwise, render the custom admin page
    return render(request, "custom_admin_page.html")


@login_required
def superadmin_redirect(request):
    if request.user.is_superuser:
        return redirect(reverse("admin:index"))
    else:
        messages.error(
            request, "You do not have permission to access the super admin page."
        )
        return redirect("custom_admin_page")

def get_special_dates(request):
    today = timezone.now().date()

    # Get users with birthdays today based on 'birth_date'
    birthday_users = list(
        CustomUser.objects.filter(
            birth_date__month=today.month,
            birth_date__day=today.day
        ).values("employee_id", "first_name", "surname")
    )

    # Get users with hiring anniversaries today based on 'date_hired'
    milestone_users = []
    for user in CustomUser.objects.filter(
        date_hired__month=today.month,
        date_hired__day=today.day
    ):
        years = today.year - user.date_hired.year
        if years >= 1:
            milestone_users.append({
                "employee_id": user.employee_id,
                "first_name": user.first_name,
                "surname": user.surname,
                "years": years
            })

    return JsonResponse({
        "birthdays": birthday_users,
        "milestones": milestone_users
    })


# Mapping: key is the code; value is a tuple (main, alias) that should match exactly what’s stored in the database.
COMPANY_CHOICES = {
    'ASC': ('ASC', 'AgriDOM'),
    'SFGCI': ('SFGCI', 'SFGC'),
    'DJAS': ('DJAS', 'DSC'),
    'FAC': ('FAC',),  # only one value; no alias
    'GTI': ('GTI',),
    'SMI': ('SMI',),
}

DEPARTMENT_CHOICES = {
    'hr': "Human Resources",
    'it': "IT Department",
    'finance': "Finance",
}

def attendance_list_json(request):
    attendance_type = request.GET.get('attendance_type', 'time-log')
    company_code = request.GET.get('attendance_company', 'all')
    department_code = request.GET.get('attendance_department', 'all')

    if attendance_type == 'time-log':
        qs = TimeEntry.objects.select_related('user', 'user__company', 'user__position')\
            .all().order_by('-time_in')

        if company_code != 'all':
            # First try a direct lookup using the received value
            names = COMPANY_CHOICES.get(company_code)
            if not names:
                # If not found, perform a reverse lookup to find which tuple contains the alias.
                for key, names_tuple in COMPANY_CHOICES.items():
                    if company_code in names_tuple:
                        names = names_tuple
                        break
            if names:
                # Use case-insensitive lookup for each name in the tuple.
                query = Q(user__company__name__iexact=names[0])
                if len(names) > 1:
                    query |= Q(user__company__name__iexact=names[1])
                qs = qs.filter(query)
            else:
                qs = qs.none()

        if department_code != 'all':
            qs = qs.filter(user__position__name=department_code)

        data = [
            {
                'employee_id': entry.user.employee_id,
                'name': f"{entry.user.first_name} {entry.user.surname}",
                'time_in': entry.time_in.strftime("%Y-%m-%d %H:%M:%S"),
                'time_out': entry.time_out.strftime("%Y-%m-%d %H:%M:%S") if entry.time_out else '',
                'hours_worked': entry.hours_worked,
            }
            for entry in qs
        ]

    elif attendance_type == 'users-active':
        qs = CustomUser.objects.filter(timeentry__time_out__isnull=True).distinct()
        if company_code != 'all':
            names = COMPANY_CHOICES.get(company_code)
            if not names:
                for key, names_tuple in COMPANY_CHOICES.items():
                    if company_code in names_tuple:
                        names = names_tuple
                        break
            if names:
                query = Q(company__name__iexact=names[0])
                if len(names) > 1:
                    query |= Q(company__name__iexact=names[1])
                qs = qs.filter(query)
            else:
                qs = qs.none()

        if department_code != 'all':
            qs = qs.filter(position__name=department_code)

        data = [
            {
                'employee_id': user.employee_id,
                'name': f"{user.first_name} {user.surname}",
            }
            for user in qs
        ]

    elif attendance_type == 'users-inactive':
        qs = CustomUser.objects.exclude(timeentry__time_out__isnull=True).distinct()
        if company_code != 'all':
            names = COMPANY_CHOICES.get(company_code)
            if not names:
                for key, names_tuple in COMPANY_CHOICES.items():
                    if company_code in names_tuple:
                        names = names_tuple
                        break
            if names:
                query = Q(company__name__iexact=names[0])
                if len(names) > 1:
                    query |= Q(company__name__iexact=names[1])
                qs = qs.filter(query)
            else:
                qs = qs.none()

        if department_code != 'all':
            qs = qs.filter(position__name=department_code)

        data = [
            {
                'employee_id': user.employee_id,
                'name': f"{user.first_name} {user.surname}",
            }
            for user in qs
        ]
    else:
        data = []

    return JsonResponse({'attendance_list': data, 'attendance_type': attendance_type})