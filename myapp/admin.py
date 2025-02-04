from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    # Fields to display in the admin list view
    list_display = ('is_staff', 'employee_id', 'first_name', 'surname', 'company', 'position', 'status')
    list_display_links = ('employee_id',)
    # Fields to include in the admin edit form
    fieldsets = (
        (None, {'fields': ('employee_id','password',)}),
        ('Personal Info', {'fields': ('first_name', 'surname','birth_date',)}),
        ('Other Info', {'fields': ('company', 'position',  'date_hired', 'pin', 'status', 'preset_name')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )

admin.site.register(CustomUser, CustomUserAdmin)