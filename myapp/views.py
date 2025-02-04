from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.urls import reverse
from .models import CustomUser
from django.views.decorators.cache import never_cache

@never_cache
def login_view(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        pin = request.POST.get('pin')

        # Use the model's business logic for authentication.
        user = CustomUser.authenticate_by_pin(employee_id, pin)
        if user:
            # Log the user in using Django's authentication system.
            login(request, user)

            # Redirect based on user type.
            if user.is_staff or user.is_superuser:
                return redirect(reverse('admin:index'))  # Admin dashboard
            else:
                return redirect('user_page')  # Regular user page
        else:
            # Handle failed authentication.
            return render(request, 'index.html', {'error': 'Invalid employee ID or PIN'})

    return render(request, 'index.html')

def user_page(request):
    return render(request, 'user_page.html')

def logout_view(request):
    logout(request)  # Logs out the user
    return redirect('login')  # Redirects to the login page
