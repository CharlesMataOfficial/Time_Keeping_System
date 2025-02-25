# attendance/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.utils.html import format_html
from django.conf import settings
from .models import CustomUser, TimeEntry, Company, Position, TimePreset, DayOverride, ScheduleGroup
from .forms import CustomUserCreationForm, TimeEntryForm
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
                    "date_hired",
                    "schedule_group",  # Use schedule_group instead of time_preset
                )
            },
        ),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "is_guard")}),
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
    search_fields = ("employee_id", "first_name", "surname", "company__name", "position__name")
    ordering = ("-employee_id",)
    list_filter = ("is_active", "is_staff", "is_superuser", "is_guard")

    # Add autocomplete fields
    autocomplete_fields = ['company', 'position', 'schedule_group']

    def save_model(self, request, obj, form, change):
        if not change and not obj.employee_id:
            obj.employee_id = CustomUser.objects.get_next_employee_id()
        super().save_model(request, obj, form, change)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions


class TimeEntryAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "user__first_name",
        "user__surname",
        "time_in",
        "time_out",
        "hours_worked",
        "is_late",
    )
    search_fields = (
        "user__employee_id",
        "user__first_name",
        "user__surname",
    )
    ordering = ("-time_in",)
    list_filter = ("time_in", "time_out", "is_late")

    fieldsets = (
        (None, {
            'fields': (
                'user',
                'time_in',
                'time_out',
                'hours_worked',
                'is_late',
                'image_path',
                'view_image_path',
            )
        }),
    )

    autocomplete_fields = ['user']
    readonly_fields = ('hours_worked', 'view_image_path',)

    def save_model(self, request, obj, form, change):
        if obj.time_in and obj.time_out:
            delta = obj.time_out - obj.time_in
            obj.hours_worked = round(delta.total_seconds() / 3600, 2)
        super().save_model(request, obj, form, change)

    def user__first_name(self, obj):
        return obj.user.first_name
    user__first_name.short_description = 'First Name'
    user__first_name.admin_order_field = 'user__first_name'

    def user__surname(self, obj):
        return obj.user.surname
    user__surname.short_description = 'Surname'
    user__surname.admin_order_field = 'user__surname'

    def view_image_path(self, obj):
        if obj.image_path:
            return format_html('<a href="{}" target="_blank">View Image</a>',
                settings.MEDIA_URL + obj.image_path)
        return "No Image"
    view_image_path.short_description = 'View Image'


class CompanyAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ('name',)


class PositionAdmin(admin.ModelAdmin):
    search_fields = ['name']
    list_display = ('name',)

class TimePresetAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_time', 'end_time', 'grace_period_minutes', 'created_at')
    search_fields = ('name',)
    list_filter = ('start_time',)
    ordering = ('start_time',)
    fieldsets = (
        ('Preset Information', {
            'fields': ('name',)
        }),
        ('Schedule', {
            'fields': ('start_time', 'end_time', 'grace_period_minutes')
        }),
    )

    class Media:
        js = ('admin/js/custom_time_options.js',)

class DayOverrideInline(admin.TabularInline):
    model = DayOverride
    extra = 0

class ScheduleGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'default_schedule', 'created_at')
    search_fields = ('name',)
    inlines = [DayOverrideInline]

# Unregister the group model
admin.site.unregister(Group)

# Register the models
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(TimePreset, TimePresetAdmin)
admin.site.register(TimeEntry, TimeEntryAdmin)
admin.site.register(Company, CompanyAdmin)
admin.site.register(Position, PositionAdmin)
admin.site.register(ScheduleGroup, ScheduleGroupAdmin)
