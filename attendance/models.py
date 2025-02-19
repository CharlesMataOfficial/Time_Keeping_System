# models.py
import datetime
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.conf import settings
from django.core.validators import MinLengthValidator
from django.forms import ValidationError
from django.utils import timezone  # timezone.now() will now return a naive datetime
from django.views.decorators.cache import never_cache
from django.contrib.auth import login
from django.shortcuts import render, redirect
from django.urls import reverse


class CustomUserManager(BaseUserManager):
    def get_next_employee_id(self):
        highest_user = self.model.objects.order_by('-employee_id').first()
        if highest_user:
            try:
                next_id = str(int(highest_user.employee_id) + 1).zfill(6)
            except ValueError:
                next_id = '000001'
        else:
            next_id = '000001'
        return next_id

    def create_user(self, employee_id=None, password=None, **extra_fields):
        if not employee_id:
            employee_id = self.get_next_employee_id()

        # Validate employee_id is numeric and 6 digits
        if not employee_id.isdigit() or len(employee_id) != 6:
            raise ValidationError("Employee ID must be a 6-digit number")

        user = self.model(employee_id=employee_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, employee_id=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(employee_id, password, **extra_fields)


class CustomUser(AbstractUser):
    # Remove the username field
    username = None
    employee_id = models.CharField(unique=True, max_length=6)
    first_name = models.CharField(max_length=100, null=True, blank=True)
    surname = models.CharField(max_length=100, null=True, blank=True)
    company = models.CharField(max_length=100, null=True, blank=True)
    position = models.CharField(max_length=100, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    date_hired = models.DateField(null=True, blank=True)
    pin = models.CharField(
        max_length=4, validators=[MinLengthValidator(4)], null=True, blank=True
    )
    status = models.BooleanField(default=True)
    preset_name = models.CharField(max_length=100, null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    if_first_login = models.BooleanField(default=True)

    # Remove other redundant fields
    email = None
    last_name = None  # Since you're using 'surname'

    USERNAME_FIELD = "employee_id"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    @classmethod
    def authenticate_by_pin(cls, employee_id, pin):
        try:
            user = cls.objects.get(employee_id=employee_id)
            if user.is_superuser:
                if user.check_password(pin):
                    return user
            elif user.is_staff:
                if user.pin == pin:
                    return user
            elif user.if_first_login and pin == "0000":
                return {"status": "first_login", "user": user}
            elif user.pin == pin:
                return user
            return None
        except cls.DoesNotExist:
            return None


class TimeEntry(models.Model):
    ordering = ["-time_in"]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    time_in = models.DateTimeField(
        auto_now_add=True
    )  # Will be naive and in local time now
    time_out = models.DateTimeField(null=True, blank=True)
    hours_worked = models.FloatField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    last_modified = models.DateTimeField(auto_now=True)
    image_path = models.CharField(max_length=255, null=True, blank=True)

    @property
    def date(self):
        return self.time_in.date()

    def clock_out(self):
        self.time_out = timezone.now()  # Now returns a naive datetime
        if self.time_in and self.time_out:
            delta = self.time_out - self.time_in
            self.hours_worked = round(delta.total_seconds() / 3600, 2)
        # For lateness, assume an expected start time of 9:00 AM
        if self.time_in:
            # Here, self.time_in is already local (naive)
            time_in_local = self.time_in
            expected_start = datetime.time(9, 0)
            self.is_late = time_in_local.time() > expected_start
        self.save()

    @classmethod
    def clock_in(cls, user):
        open_entries = cls.objects.filter(user=user, time_out__isnull=True)
        for entry in open_entries:
            entry.clock_out()

        new_entry = cls.objects.create(user=user)
        # Determine lateness only for the first entry of the day
        today = new_entry.time_in.date()  # Already local date
        if not cls.objects.filter(user=user, time_in__date=today).exists():
            time_in_local = new_entry.time_in
            expected_start = datetime.time(8, 0)  # Adjust as needed
            expected_start_dt = datetime.datetime.combine(
                time_in_local.date(), expected_start
            )
            grace_period = datetime.timedelta(minutes=5)
            expected_start_with_grace = expected_start_dt + grace_period

            if time_in_local > expected_start_with_grace:
                new_entry.is_late = True
            else:
                new_entry.is_late = False

            new_entry.save()
        return new_entry

class Announcement(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_posted = models.BooleanField(default=False)

    def __str__(self):
        return f"Announcement {self.id}"