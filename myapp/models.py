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
    id = models.CharField(primary_key=True, max_length=6)
    employee_id = models.CharField(max_length=6, unique=True)
    date = models.DateField(null=True)
    time_in = models.DateTimeField()
    time_out = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.id:
            self.time_in = timezone.now()
        self.time_out = timezone.now()
        return super(TimeEntry, self).save(*args, **kwargs)