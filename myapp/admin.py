from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    # Fields to display in the admin list view
    list_display = ('username', 'employee_id', 'email', 'first_name', 'surname', 'is_staff')
    # Fields to include in the admin edit form
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('employee_id', 'first_name', 'surname', 'email')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Other Info', {'fields': ('company', 'position', 'birth_date', 'date_hired', 'pin', 'status', 'preset_name')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)