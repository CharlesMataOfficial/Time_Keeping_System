from django.shortcuts import render, redirect
from django.http import HttpResponse
from .models import CustomUser

# # This is your login view
def login_view(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        pin = request.POST.get('pin')

        try:
            # Attempt to find the user in the database using employee_id
            user = CustomUser.objects.get(employee_id=employee_id)

            # Check if the pin matches
            if user.pin == pin:
                print("Login successful! Redirecting to user page...")
                return redirect('user_page')
            else:
                return render(request, 'index.html', {'error': 'Incorrect PIN'})
        except CustomUser.DoesNotExist:
            return render(request, 'index.html', {'error': 'Employee ID not found'})

    return render(request, 'index.html')

def user_page(request):
    # Optionally pass data to the template from your database
    return render(request, 'user_page.html')