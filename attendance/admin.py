# attendance/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from .models import CustomUser
from .forms import CustomUserCreationForm

class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    add_form_template = "admin/custom_user_add_form.html"

    # Remove password from required fields for adding new users
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'employee_id',
                'first_name',
                'surname',
                'birth_date',
                'company',
                'position',
                'date_hired',
            ),
        }),
    )

    # Updated fieldsets - removed 'status' field and added is_active instead
    fieldsets = (
        (None, {"fields": ("employee_id", "password", "pin")}),
        ("Personal Info", {"fields": ("first_name", "surname", "birth_date")}),
        ("Other Info", {
            "fields": (
                "company",
                "position",
                "date_hired",
                "preset_name",
            )
        }),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )

    list_display = ('employee_id', 'first_name', 'surname', 'company', 'position', 'is_active')
    search_fields = ('employee_id', 'first_name', 'surname', 'company')
    ordering = ('employee_id',)

    def save_model(self, request, obj, form, change):
        if not change and not obj.employee_id:
            obj.employee_id = CustomUser.objects.get_next_employee_id()
        super().save_model(request, obj, form, change)

# Unregister the group model
admin.site.unregister(Group)

# Register the models
admin.site.register(CustomUser, CustomUserAdmin)