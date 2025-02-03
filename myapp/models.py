from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

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

class TimeEntry(models.Model):
    employee_id = models.CharField(max_length=6)  # Remove unique=True
    time_in = models.DateTimeField(auto_now_add=True)  # Auto-set on creation
    time_out = models.DateTimeField(null=True, blank=True)  # Manually set later

    # Derive date from time_in (optional)
    @property
    def date(self):
        return self.time_in.date()

    # Custom save not needed; handle time_out in views
    def clock_out(self):
        self.time_out = timezone.now()
        self.save()