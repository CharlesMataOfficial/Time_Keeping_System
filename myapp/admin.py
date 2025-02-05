from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser
from .forms import CustomUserCreationForm  # Import the form

class CustomUserAdmin(UserAdmin):
    ordering = ("employee_id",)
    list_display = ("employee_id", "first_name", "surname", "company", "position", "status", "is_staff")
    list_display_links = ("employee_id",)

    add_form = CustomUserCreationForm  # Assign the custom form

    fieldsets = (
        (None, {"fields": ("password",)}),
        ("Personal Info", {"fields": ("first_name", "surname", "birth_date")}),
        ("Other Info", {"fields": ("company", "position", "date_hired", "pin", "status", "preset_name")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("employee_id", "first_name", "surname", "birth_date", "company", "position", "date_hired", "password1", "password2"),
        }),
    )

    # def save_model(self, request, obj, form, change):
    #     obj.pin = obj.password  # Store PIN (not hashed, if required)
    #     super().save_model(request, obj, form, change)

admin.site.register(CustomUser, CustomUserAdmin)
