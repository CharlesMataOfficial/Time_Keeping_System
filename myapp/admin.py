# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    # Use employee_id instead of username for ordering
    ordering = ('employee_id',)

    # Fields to display in the admin list view
    list_display = ('employee_id', 'first_name', 'surname', 'company', 'position', 'status', 'is_staff')
    list_display_links = ('employee_id',)

    # Fields to include in the admin edit form
    fieldsets = (
        (None, {'fields': ('password',)}),
        ('Personal Info', {'fields': ('first_name', 'surname', 'birth_date')}),
        ('Other Info', {'fields': ('company', 'position', 'date_hired', 'pin', 'status', 'preset_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )

    # Fields to include in the "add user" form
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('employee_id', 'password1', 'password2'),
        }),
    )

# Register the CustomUser model with the updated CustomUserAdmin
admin.site.register(CustomUser, CustomUserAdmin)