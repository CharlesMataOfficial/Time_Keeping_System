# attendance/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from django.conf import settings
from .models import (
    CustomUser,
    TimeEntry,
    Company,
    Department,
    Position,
    TimePreset,
    DayOverride,
    ScheduleGroup,
    AdminLog,
)
from .forms import CustomUserCreationForm, TimeEntryForm
from .utils import log_admin_action

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

    # Updated fieldsets - removed 'status' field and added is_active instead
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
                )
            },
        ),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "is_guard")},
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
    autocomplete_fields = ["company", "position", "department","schedule_group"]

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
    readonly_fields = (
        "hours_worked",
        "view_image_path",
    )

    def formatted_minutes_late(self, obj):
        if obj.minutes_late > 0:
            return format_html(
                '<span style="color: red;">{} mins late</span>', obj.minutes_late
            )
        elif obj.minutes_late < 0:
            return format_html(
                '<span style="color: green;">{} mins early</span>',
                abs(obj.minutes_late),
            )
        else:
            return "On time"

    formatted_minutes_late.short_description = "Arrival Status"
    formatted_minutes_late.admin_order_field = "minutes_late"

    def save_model(self, request, obj, form, change):
        if obj.time_in and obj.time_out:
            delta = obj.time_out - obj.time_in
            obj.hours_worked = round(delta.total_seconds() / 3600, 2)
        super().save_model(request, obj, form, change)

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
