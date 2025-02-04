from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings
import datetime

class CustomUser(AbstractUser):
    employee_id = models.CharField(unique=True, max_length=6, editable=False)
    first_name = models.CharField(max_length=100, null=True)
    surname = models.CharField(max_length=100, null=True)
    company = models.CharField(max_length=100, null=True)
    position = models.CharField(max_length=100, null=True)
    birth_date = models.DateField(null=True)
    date_hired = models.DateField(null=True)
    pin = models.CharField(max_length=4, null=True)
    status = models.BooleanField(default=True)
    preset_name = models.CharField(max_length=100, null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    # Remove redundant fields from AbstractUser
    email = None  # This removes email from the database
    last_name = None  # You're using 'surname' instead

    # Set employee_id as the unique identifier
    USERNAME_FIELD = "employee_id"
    REQUIRED_FIELDS = []  # No extra required fields

    @classmethod
    def authenticate_by_pin(cls, employee_id, pin):
        """Tries to authenticate a user based on employee_id and pin."""
        try:
            user = cls.objects.get(employee_id=employee_id)
            if user.pin == pin:
                return user
        except cls.DoesNotExist:
            return None

class TimeEntry(models.Model):
    ordering = ["-time_in"]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    time_in = models.DateTimeField(auto_now_add=True)  # Auto-set on creation
    time_out = models.DateTimeField(null=True, blank=True)  # Manually set later
    hours_worked = models.FloatField(null=True, blank=True)
    is_late = models.BooleanField(default=False)

    @property
    def date(self):
        """Returns the date part of the time_in timestamp."""
        return self.time_in.date()

    def clock_out(self):
        """Clocks out an entry by setting the time_out, calculating hours worked,
        and determining lateness."""
        self.time_out = timezone.now()

        if self.time_in and self.time_out:
            delta = self.time_out - self.time_in
            # Calculate hours worked (you might also consider minutes if needed)
            self.hours_worked = round(delta.total_seconds() / 3600, 2)

        # For lateness, assume an expected start time of 9:00 AM (local time)
        if self.time_in:
            # Convert time_in to local time (if your project settings use time zones)
            time_in_local = timezone.localtime(self.time_in)
            expected_start = datetime.time(9, 0)
            self.is_late = time_in_local.time() > expected_start

        self.save()

    @classmethod
    def clock_in(cls, user):
        """
        When clocking in, first check if there are any open entries (entries
        with no time_out) for the given employee and clock them out automatically.
        Then create a new entry.
        """
        # Find any open entries (i.e. not clocked out)
        open_entries = cls.objects.filter(
            user=user,
            time_out__isnull=True
        )
        for entry in open_entries:
            entry.clock_out()

        # Create a new clock-in entry
        new_entry = cls.objects.create(user=user)

        # Determine lateness (only for first entry of the day)
        if not cls.objects.filter(user=user, time_in__date=timezone.now().date()).exists():
            time_in_local = timezone.localtime(new_entry.time_in)
            expected_start = datetime.time(8, 0) # Adjust time here, currently 9am

            # Add 5-minute grace period
            grace_period = datetime.timedelta(minutes=5)
            expected_start_with_grace = datetime.datetime.combine(time_in_local.date(), expected_start) + grace_period

            # Check if the user clocked in after the grace period
            if time_in_local > expected_start_with_grace:
                new_entry.is_late = True
            else:
                new_entry.is_late = False

            new_entry.save()  # Make sure to save the new entry after determining lateness

        return new_entry
