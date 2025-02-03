from django.shortcuts import render, redirect
from django.contrib.auth import login  # Add this import
from django.urls import reverse
from .models import CustomUser

def login_view(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        pin = request.POST.get('pin')

        try:
            user = CustomUser.objects.get(employee_id=employee_id)

            if user.pin == pin:
                # Log the user into Django's authentication system
                login(request, user)  # 👈 Critical for admin access

                # Check admin status and redirect
                if user.is_staff or user.is_superuser:
                    return redirect(reverse('admin:index'))  # Admin dashboard
                else:
                    return redirect('user_page')  # Regular user page

            else:
                return render(request, 'index.html', {'error': 'Incorrect PIN'})

        except CustomUser.DoesNotExist:
            return render(request, 'index.html', {'error': 'Employee ID not found'})

    return render(request, 'index.html')

def user_page(request):
    # Optionally pass data to the template from your database
    return render(request, 'user_page.html')