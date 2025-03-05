import datetime

from django.conf import settings
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.utils import timezone
from django.utils.html import format_html

from .forms import CustomUserCreationForm, TimeEntryForm
from .models import LeaveType
from .models import (AdminLog, Company, CustomUser, DayOverride, Department,
                     Leave, Position, ScheduleGroup, TimeEntry, TimePreset)
from .utils import get_day_code, log_admin_action


class TimeEntryInline(admin.TabularInline):
    model = TimeEntry
    form = TimeEntryForm
    extra = 1  # Number of extra forms to display


def deactivate_users(modeladmin, request, queryset):
    queryset.update(is_active=False)


deactivate_users.short_description = "Deactivate selected users"


def activate_users(modeladmin, request, queryset):
    queryset.update(is_active=True)


activate_users.short_description = "Activate selected users"


class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    add_form_template = "admin/custom_user_add_form.html"
    actions = [activate_users, deactivate_users]  # Add the actions here

    # Remove password from required fields for adding new users
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "employee_id",
                    "first_name",
                    "surname",
                    "birth_date",
                    "company",
                    "position",
                    "date_hired",
                ),
            },
        ),
    )

    # Updated fieldsets - add manager field to Other Info
    fieldsets = (
        (None, {"fields": ("employee_id", "password", "pin")}),
        ("Personal Info", {"fields": ("first_name", "surname", "birth_date")}),
        (
            "Other Info",
            {
                "fields": (
                    "company",
                    "position",
                    "department",
                    "date_hired",
                    "schedule_group",
                    "manager",  # Add manager field here
                    "leave_credits",  # Also add leave_credits to make it editable
                )
            },
        ),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "is_guard", "is_hr")},  # Add is_hr here
        ),
    )

    list_display = (
        "employee_id",
        "first_name",
        "surname",
        "company",
        "position",
        "is_active",
        "schedule_group",  # Update list_display too
        "manager",  # Add manager field here
    )
    search_fields = (
        "employee_id",
        "first_name",
        "surname",
        "company__name",
        "position__name",
    )
    ordering = ("-employee_id",)
    list_filter = ("is_active", "is_staff", "is_superuser", "is_guard")

    # Add autocomplete fields
    autocomplete_fields = ["company", "position", "department", "schedule_group", "manager"]

    def save_model(self, request, obj, form, change):
        if not change and not obj.employee_id:
            obj.employee_id = CustomUser.objects.get_next_employee_id()

        # Log admin action with better descriptions
        action_type = 'admin_update' if change else 'admin_create'
        if change:
            log_admin_action(request, action_type, f"Updated user {obj.employee_id}")
        else:
            log_admin_action(request, action_type, f"Created user {obj.employee_id}")

        super().save_model(request, obj, form, change)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if "delete_selected" in actions:
            del actions["delete_selected"]
        return actions

    def delete_model(self, request, obj):
        # Log the deletion before the object is deleted
        log_admin_action(
            request,
            'admin_delete',
            f"Deleted user {obj.employee_id}"
        )
        super().delete_model(request, obj)


class TimeEntryAdmin(admin.ModelAdmin):
    list_display = (
        "user__first_name",
        "user__surname",
        "user__employee_id",
        "time_in",
        "time_out",
        "hours_worked",
        "is_late",
        "formatted_minutes_late",
        "view_image_path",
    )
    search_fields = ("user__first_name", "user__surname", "user__employee_id")
    list_filter = ("is_late", "time_in")

    fieldsets = [
        ("User Information", {"fields": ["user"]}),
        ("Time Information", {"fields": ["time_in", "time_out", "hours_worked"]}),
        ("Status", {"fields": ["is_late", "minutes_late"]}),
        ("Other", {"fields": ["image_path"]}),
    ]

    autocomplete_fields = ["user"]

    # Make these fields read-only
    readonly_fields = ("hours_worked", "is_late", "minutes_late", "view_image_path")

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)

        # Check if fields exist in base_fields before setting help_text
        if 'hours_worked' in form.base_fields:
            form.base_fields['hours_worked'].help_text = "Automatically calculated based on time in and time out."
        if 'is_late' in form.base_fields:
            form.base_fields['is_late'].help_text = "Automatically calculated based on time in and user's schedule."
        if 'minutes_late' in form.base_fields:
            form.base_fields['minutes_late'].help_text = "Automatically calculated based on time in and user's schedule."

        return form

    def save_model(self, request, obj, form, change):
        # Always calculate hours worked if time_in and time_out exist
        if obj.time_in and obj.time_out:
            delta = obj.time_out - obj.time_in
            obj.hours_worked = round(delta.total_seconds() / 3600, 2)

        # Always calculate lateness if time_in exists
        if obj.time_in:
            try:
                time_in_local = obj.time_in
                day_code = get_day_code(time_in_local)

                # Get schedule using get_schedule_for_day
                preset = obj.user.get_schedule_for_day(day_code)
                if preset:
                    expected_start = preset.start_time
                    grace_period = datetime.timedelta(minutes=preset.grace_period_minutes)

                    naive_expected_time = datetime.datetime.combine(
                        time_in_local.date(), expected_start
                    )

                    expected_start_dt = timezone.make_aware(naive_expected_time)
                    expected_with_grace = expected_start_dt + grace_period

                    if not timezone.is_aware(time_in_local):
                        time_in_local = timezone.make_aware(time_in_local)

                    obj.is_late = time_in_local > expected_with_grace

                    time_diff = time_in_local - expected_start_dt
                    obj.minutes_late = round(time_diff.total_seconds() / 60)
                else:
                    obj.is_late = False
                    obj.minutes_late = 0
            except Exception as e:
                obj.is_late = False
                obj.minutes_late = 0
                print(f"Error calculating lateness: {e}")

        super().save_model(request, obj, form, change)

    def formatted_minutes_late(self, obj):
        if obj.minutes_late == 0:
            return ""

        # Format for display - either hours/minutes or raw minutes
        is_late = obj.minutes_late > 0
        abs_mins = abs(obj.minutes_late)

        # Format in hours and minutes
        hours = abs_mins // 60
        mins = abs_mins % 60

        if hours > 0:
            if mins > 0:
                formatted_time = f"{hours} hr {mins} min"
            else:
                formatted_time = f"{hours} hr"
        else:
            formatted_time = f"{mins} min"

        # Format in raw minutes
        raw_minutes = f"{abs_mins} min"

        # Determine status text
        status = "late" if is_late else "early"

        # Create HTML with data attributes for toggling
        color = "red" if is_late else "green"
        return format_html(
            '<span style="color: {color}; cursor: pointer;" '
            'class="toggle-time-format" '
            'data-formatted="{formatted} {status}" '
            'data-raw="{raw} {status}" '
            'onclick="toggleTimeFormat(this)">'
            '{formatted} {status}</span>',
            color=color,
            formatted=formatted_time,
            raw=raw_minutes,
            status=status
        )

    formatted_minutes_late.short_description = "Arrival Status"
    formatted_minutes_late.admin_order_field = "minutes_late"

    def user__first_name(self, obj):
        return obj.user.first_name

    user__first_name.short_description = "First Name"
    user__first_name.admin_order_field = "user__first_name"

    def user__surname(self, obj):
        return obj.user.surname

    user__surname.short_description = "Surname"
    user__surname.admin_order_field = "user__surname"

    def view_image_path(self, obj):
        if obj.image_path:
            return format_html(
                '<a href="{}" target="_blank">View Image</a>',
                settings.MEDIA_URL + obj.image_path,
            )
        return "No Image"

    view_image_path.short_description = "View Image"

    class Media:
        js = ("admin/js/toggle_time_format.js",)


class CompanyAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ("name",)


class DepartmentAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ("name",)


class PositionAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ("name",)


class TimePresetAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "start_time",
        "end_time",
        "grace_period_minutes",
        "created_at",
    )
    search_fields = ("name",)
    list_filter = ("start_time",)
    ordering = ("start_time",)
    fieldsets = (
        ("Preset Information", {"fields": ("name",)}),
        ("Schedule", {"fields": ("start_time", "end_time", "grace_period_minutes")}),
    )

    class Media:
        js = ("admin/js/custom_time_options.js",)


class DayOverrideInline(admin.TabularInline):
    model = DayOverride
    extra = 0


class ScheduleGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "default_schedule", "get_overrides", "created_at")
    search_fields = ("name",)
    inlines = [DayOverrideInline]

    def get_overrides(self, obj):
        overrides = obj.day_overrides.all()
        if overrides:
            override_list = [
                f"{dict(DayOverride.DAY_CHOICES)[o.day]}: "
                f"{o.time_preset.start_time.strftime('%I:%M %p')} - "
                f"{o.time_preset.end_time.strftime('%I:%M %p')}"
                for o in overrides
            ]
            return format_html("<br>".join(override_list))
        return ""

    get_overrides.short_description = "Day Overrides"
    get_overrides.allow_tags = True


class AdminLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'description', 'ip_address', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('user__employee_id', 'user__first_name', 'user__surname', 'description')
    readonly_fields = ('user', 'action', 'description', 'ip_address', 'timestamp')
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False  # Changed from superuser-only to nobody

    def has_change_permission(self, request, obj=None):
        return False  # Prevent editing

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['show_save'] = False
        extra_context['show_save_and_continue'] = False
        extra_context['show_delete'] = False
        return super().changeform_view(request, object_id, form_url, extra_context)


# Add this class
class LeaveTypeAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ("name",)


class LeaveAdmin(admin.ModelAdmin):
    list_display = ('employee', 'leave_type', 'start_date', 'end_date', 'status', 'created_at')
    list_filter = ('status', 'leave_type', 'start_date')
    search_fields = ('employee__first_name', 'employee__surname', 'employee__employee_id', 'reason')
    date_hierarchy = 'start_date'
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Employee Information', {'fields': ('employee',)}),
        ('Leave Details', {'fields': ('leave_type', 'start_date', 'end_date', 'reason')}),
        ('Status', {'fields': ('status', 'rejection_reason')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


# Unregister the group model
admin.site.unregister(Group)

# Register the models
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(TimePreset, TimePresetAdmin)
admin.site.register(TimeEntry, TimeEntryAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Position, PositionAdmin)
admin.site.register(ScheduleGroup, ScheduleGroupAdmin)
admin.site.register(Department, DepartmentAdmin)
admin.site.register(AdminLog, AdminLogAdmin)
admin.site.register(LeaveType, LeaveTypeAdmin)  # Register the model at the bottom with other admin registrations
admin.site.register(Leave, LeaveAdmin)  # Register the Leave model with LeaveAdmin
