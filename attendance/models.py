from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinLengthValidator
from django.db import models
from django.db.models import Max
from django.forms import ValidationError
from django.utils import timezone
from .utils import create_default_time_preset, get_day_code
import datetime as dt


class CustomUserManager(BaseUserManager):
    """
    Custom user manager for the CustomUser model.
    """
    def get_next_employee_id(self):
        """
        Generate the next available employee ID.

        Returns:
            str: The next available employee ID, padded with leading zeros.

        Raises:
            ValueError: If no available employee IDs can be found.
        """
        highest_id = self.model.objects.aggregate(Max("employee_id"))[
            "employee_id__max"
        ]

        if not highest_id:
            return "000001"

        next_id = int(highest_id) + 1

        if next_id > 999999:
            existing_ids = set(self.model.objects.values_list("employee_id", flat=True))

            for i in range(1, 1000000):
                candidate = str(i).zfill(6)
                if candidate not in existing_ids:
                    return candidate

            raise ValueError("No available employee IDs - all slots filled")

        return str(next_id).zfill(6)

    def create_user(self, employee_id=None, password=None, **extra_fields):
        """
        Create and save a CustomUser with the given employee_id and password.

        Args:
            employee_id (str, optional): The employee ID. If None, a new one is generated.
            password (str): The user's password.
            **extra_fields: Additional fields to set on the user.

        Returns:
            CustomUser: The created user object.

        Raises:
            ValidationError: If the employee_id is not a 6-digit number.
        """
        if not employee_id:
            employee_id = self.get_next_employee_id()

        if not employee_id.isdigit() or len(employee_id) != 6:
            raise ValidationError("Employee ID must be a 6-digit number")

        user = self.model(employee_id=employee_id, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, employee_id=None, password=None, **extra_fields):
        """
        Create and save a superuser with the given employee_id and password.

        Args:
            employee_id (str, optional): The employee ID. If None, a new one is generated.
            password (str): The user's password.
            **extra_fields: Additional fields to set on the user.

        Returns:
            CustomUser: The created superuser object.

        Raises:
            ValueError: If is_staff or is_superuser is not True.
        """
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(employee_id, password, **extra_fields)


class Company(models.Model):
    """
    Represents a company.
    """
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "User Companies"
        ordering = ["name"]
        db_table = "django_companies"


class Department(models.Model):
    """
    Represents a department within a company.
    """
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "User Departments"
        ordering = ["name"]
        db_table = "django_departments"


class Position(models.Model):
    """
    Represents a job position within a company.
    """
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "User Positions"
        ordering = ["name"]
        db_table = "django_positions"


class CustomUser(AbstractUser):
    """
    Custom user model extending AbstractUser.
    """
    employee_id = models.CharField(unique=True, max_length=6)
    first_name = models.CharField(max_length=100, null=True, blank=True)
    surname = models.CharField(max_length=100, null=True, blank=True)
    company = models.ForeignKey(
        'Company', on_delete=models.SET_NULL, null=True, blank=True
    )
    position = models.ForeignKey(
        'Position', on_delete=models.SET_NULL, null=True, blank=True
    )
    department = models.ForeignKey(
        'Department', on_delete=models.SET_NULL, null=True, blank=True
    )
    birth_date = models.DateField(null=True, blank=True)
    date_hired = models.DateField(null=True, blank=True)
    pin = models.CharField(
        max_length=4, validators=[MinLengthValidator(4)], null=True, blank=True
    )
    schedule_group = models.ForeignKey(
        "ScheduleGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="Time Schedule",
    )
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    leave_credits = models.IntegerField(default=16)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_guard = models.BooleanField(default=False)
    is_hr = models.BooleanField(default=False)
    if_first_login = models.BooleanField(default=True)

    USERNAME_FIELD = "employee_id"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    @classmethod
    def authenticate_by_pin(cls, employee_id, pin):
        """
        Authenticate a user by employee ID and PIN.

        Args:
            employee_id (str): The employee ID.
            pin (str): The PIN.

        Returns:
            CustomUser or dict or None: The user object if authentication is successful.
                Returns a dict with status "first_login" and the user if it's the user's first login.
                Returns None if authentication fails.
        """
        try:
            user = cls.objects.get(employee_id=employee_id)
            if not user.is_active:
                return None
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

    def get_schedule_for_day(self, day_code):
        """
        Get the schedule that applies to this user for the specified day.

        Args:
            day_code (str): The day code (e.g., 'mon', 'tue', 'wed').

        Returns:
            TimePreset: The TimePreset object for the specified day.
        """
        if self.schedule_group:
            return self.schedule_group.get_schedule_for_day(day_code)
        else:
            return create_default_time_preset(day_code)

    class Meta:
        db_table = "django_users"
        verbose_name = "User"
        verbose_name_plural = "Users"


class TimeEntry(models.Model):
    """
    Represents a time entry record for a user.
    """
    ordering = ["-time_in"]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    time_in = models.DateTimeField(default=timezone.now, editable=True)
    time_out = models.DateTimeField(null=True, blank=True)
    hours_worked = models.FloatField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    minutes_late = models.IntegerField(default=0)
    last_modified = models.DateTimeField(auto_now=True)
    image_path = models.CharField(max_length=255, null=True, blank=True)

    @property
    def date(self):
        """
        Get the date of the time entry.

        Returns:
            date: The date of the time entry.
        """
        return self.time_in.date()

    def clock_out(self):
        """
        Record the clock-out time and calculate hours worked and lateness.
        """
        self.time_out = timezone.now()

        if self.time_in and self.time_out:
            delta = self.time_out - self.time_in
            self.hours_worked = round(delta.total_seconds() / 3600, 2)

        if self.time_in:
            try:
                time_in_local = self.time_in
                day_code = get_day_code(time_in_local)

                preset = self.user.get_schedule_for_day(day_code)
                if preset:
                    expected_start = preset.start_time
                    grace_period = dt.datetime.timedelta(minutes=preset.grace_period_minutes)

                    naive_expected_time = dt.datetime.combine(
                        time_in_local.date(), expected_start
                    )

                    expected_start_dt = timezone.make_aware(naive_expected_time)
                    expected_with_grace = expected_start_dt + grace_period

                    if not timezone.is_aware(time_in_local):
                        time_in_local = timezone.make_aware(time_in_local)

                    self.is_late = time_in_local > expected_with_grace

                    time_diff = time_in_local - expected_start_dt
                    self.minutes_late = round(time_diff.total_seconds() / 60)
                else:
                    self.is_late = False
                    self.minutes_late = 0
            except Exception as e:
                self.is_late = False
                self.minutes_late = 0
                print(f"Error in clock_out: {e}")

        self.save()

    @classmethod
    def clock_in(cls, user):
        """
        Record the clock-in time and calculate lateness.

        Args:
            user (CustomUser): The user clocking in.

        Returns:
            TimeEntry: The created TimeEntry object.
        """
        new_entry = cls.objects.create(user=user)
        try:
            time_in_local = new_entry.time_in
            day_code = get_day_code(time_in_local)

            preset = user.get_schedule_for_day(day_code)
            if preset:
                naive_expected_time = dt.datetime.combine(
                    time_in_local.date(), preset.start_time
                )

                expected_time = timezone.make_aware(naive_expected_time)

                if not timezone.is_aware(time_in_local):
                    time_in_local = timezone.make_aware(time_in_local)

                grace_period = dt.timedelta(minutes=preset.grace_period_minutes)
                expected_time_with_grace = expected_time + grace_period

                new_entry.is_late = time_in_local > expected_time_with_grace

                time_diff = time_in_local - expected_time
                new_entry.minutes_late = round(time_diff.total_seconds() / 60)
                new_entry.save()
        except Exception as e:
            new_entry.is_late = False
            new_entry.minutes_late = 0
            new_entry.save()
            print(f"Error in clock_in: {e}")

        return new_entry

    def clean(self):
        """
        Validate entry and calculate derived values.
        """
        super().clean()

        if self.time_in and hasattr(self, 'user') and self.user:
            try:
                time_in_local = self.time_in

                if not timezone.is_aware(time_in_local):
                    time_in_local = timezone.make_aware(time_in_local)

                day_code = get_day_code(time_in_local)

                preset = self.user.get_schedule_for_day(day_code)
                if preset:
                    expected_start = preset.start_time

                    naive_expected_time = dt.datetime.combine(
                        time_in_local.date(), expected_start
                    )

                    expected_start_dt = timezone.make_aware(naive_expected_time)

                    time_diff = time_in_local - expected_start_dt
                    self.minutes_late = round(time_diff.total_seconds() / 60)

                    grace_period = dt.timedelta(minutes=preset.grace_period_minutes)
                    expected_with_grace = expected_start_dt + grace_period
                    self.is_late = time_in_local > expected_with_grace
            except Exception as e:
                print(f"Error calculating lateness in clean(): {e}")

    def save(self, *args, **kwargs):
        """
        Save the TimeEntry object.
        """
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.employee_id} - {self.user.first_name} {self.user.surname} - {self.time_in.strftime('%Y-%m-%d %H:%M:%S')}"

    class Meta:
        verbose_name_plural = "Time Entries"
        db_table = "django_time_entries"


class Announcement(models.Model):
    """
    Represents an announcement.
    """
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_posted = models.BooleanField(default=False)

    def __str__(self):
        return f"Announcement {self.id}"

    class Meta:
        db_table = "django_announcements"


class TimePreset(models.Model):
    """
    Represents a time preset.
    """
    name = models.CharField(max_length=100, blank=True, null=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_period_minutes = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """
        Save the TimePreset object.
        """
        if self.name is None:
            self.name = ""
        super(TimePreset, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')})"

    class Meta:
        verbose_name = "Time Preset"
        verbose_name_plural = "Time Presets"
        ordering = ["start_time"]


class ScheduleGroup(models.Model):
    """
    Represents a schedule group.
    """
    name = models.CharField(max_length=100, null=True, blank=True)
    default_schedule = models.ForeignKey(
        "TimePreset", on_delete=models.SET_NULL, null=True, blank=True, related_name="default_for_groups"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        """
        Save the ScheduleGroup object.
        """
        if self.name is None or self.name == "":
            start_time = self.default_schedule.start_time.strftime("%I:%M %p")
            end_time = self.default_schedule.end_time.strftime("%I:%M %p")
            self.name = f"{start_time} - {end_time}"
        super(ScheduleGroup, self).save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}"

    def get_schedule_for_day(self, day_code):
        """
        Get the appropriate TimePreset for a specific day.

        Args:
            day_code (str): The day code (e.g., 'mon', 'tue', 'wed').

        Returns:
            TimePreset: The TimePreset object for the specified day.
        """
        try:
            override = self.day_overrides.get(day=day_code)
            return override.time_preset
        except DayOverride.DoesNotExist:
            if self.default_schedule:
                return self.default_schedule
            else:
                return create_default_time_preset(day_code)

    class Meta:
        verbose_name = "Time Schedule"
        verbose_name_plural = "Time Schedules"
        ordering = ["name"]


class DayOverride(models.Model):
    """
    Represents a day-specific override for a schedule group.
    """
    DAY_CHOICES = [
        ("mon", "Monday"),
        ("tue", "Tuesday"),
        ("wed", "Wednesday"),
        ("thu", "Thursday"),
        ("fri", "Friday"),
        ("sat", "Saturday"),
        ("sun", "Sunday"),
    ]

    schedule_group = models.ForeignKey(
        ScheduleGroup, on_delete=models.CASCADE, related_name="day_overrides"
    )
    day = models.CharField(max_length=3, choices=DAY_CHOICES)
    time_preset = models.ForeignKey(
        "TimePreset", on_delete=models.SET_NULL, null=True, blank=True, related_name="used_in_overrides"
    )

    class Meta:
        verbose_name = "Day Override"
        verbose_name_plural = "Day Overrides"
        unique_together = [
            "schedule_group",
            "day",
        ]


class AdminLog(models.Model):
    """
    Represents a log of admin actions.
    """
    ACTION_CHOICES = (
        ('navigation', 'Navigation'),
        ('announcement_create', 'Announcement Created'),
        ('announcement_post', 'Announcement Posted'),
        ('announcement_delete', 'Announcement Deleted'),
        ('leave_approval', 'Leave Approval'),
        ('login', 'User Login'),
        ('logout', 'User Logout'),
        ('admin_create', 'Admin Create'),
        ('admin_update', 'Admin Update'),
        ('admin_delete', 'Admin Delete'),
    )

    user = models.ForeignKey('CustomUser', on_delete=models.CASCADE)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user} - {self.action} - {self.timestamp}"

    def save(self, *args, **kwargs):
        """
        Save the AdminLog object.
        """
        if self.pk:
            raise PermissionError("Admin logs cannot be modified after creation")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """
        Delete the AdminLog object.
        """
        raise PermissionError("Admin logs cannot be deleted")


class LeaveType(models.Model):
    """
    Represents a type of leave.
    """
    name = models.CharField(max_length=100, unique=True)
    is_paid = models.BooleanField(default=True, help_text="Whether this leave type uses leave credits")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Leave Types"
        ordering = ["name"]
        db_table = "django_leave_types"


class Leave(models.Model):
    """
    Represents a leave request.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending Manager Approval'),
        ('APPROVED_BY_MANAGER', 'Approved by Manager'),
        ('REJECTED_BY_MANAGER', 'Rejected by Manager'),
        ('APPROVED_BY_HR', 'Approved by HR'),
        ('REJECTED_BY_HR', 'Rejected by HR')
    )

    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='leaves')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    rejection_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_duration(self):
        """
        Get the duration of the leave in days.

        Returns:
            int: The duration of the leave.
        """
        return (self.end_date - self.start_date).days + 1

    def __str__(self):
        return f"{self.employee}'s leave request from {self.start_date} to {self.end_date}"

    class Meta:
        ordering = ['-created_at']