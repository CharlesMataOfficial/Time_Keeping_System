from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings

class CustomUser(AbstractUser):
    employee_id = models.CharField(unique=True, max_length=6)
    first_name = models.CharField(max_length=100, null=True)
    surname = models.CharField(max_length=100, null=True)
    company = models.CharField(max_length=100, null=True)
    position = models.CharField(max_length=100, null=True)
    birth_date = models.DateField(null=True)
    date_hired = models.DateField(null=True)
    pin = models.CharField(max_length=4, null=True)
    status = models.BooleanField(default=True)
    preset_name = models.CharField(max_length=100, null=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    # Remove redundant fields from AbstractUser
    last_name = None  # You're using 'surname' instead
    @classmethod
    def authenticate_by_pin(cls, employee_id, pin):
        """
        Tries to authenticate a user based on employee_id and pin.
        Returns the user instance if successful, or None if not.
        """
        try:
            user = cls.objects.get(employee_id=employee_id)
            if user.pin == pin:
                return user
        except cls.DoesNotExist:
            return None

class TimeEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
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