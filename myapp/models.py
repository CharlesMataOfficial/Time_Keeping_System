from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    employee_id = models.CharField(unique=True, max_length=6)
    first_name = models.CharField(max_length=100, null=True)
    surname = models.CharField(max_length=100, null=True)
    company = models.CharField(max_length=100, null=True)
    position = models.CharField(max_length=100, null=True)
    birth_date = models.DateField(null=True)
    date_hired = models.DateField(null=True)
    pin = models.CharField(max_length=4, null=True)
    status = models.IntegerField(null=True)
    preset_name = models.CharField(max_length=100, null=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    # Remove redundant fields from AbstractUser
    last_name = None  # You're using 'surname' instead