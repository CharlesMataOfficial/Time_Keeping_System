# admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    ordering = ('employee_id',)
    list_display = ('employee_id', 'first_name', 'surname', 'company', 'position', 'status', 'is_staff')
    list_display_links = ('employee_id',)
    fieldsets = (
        (None, {'fields': ('password',)}),  # Password field is enough in fieldsets
        ('Personal Info', {'fields': ('first_name', 'surname', 'birth_date')}),
        ('Other Info', {'fields': ('company', 'position', 'date_hired', 'pin', 'status', 'preset_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('employee_id', 'password', 'password2'),  # Corrected fields
        }),
    )

admin.site.register(CustomUser, CustomUserAdmin)