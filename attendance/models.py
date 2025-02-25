import datetime
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.db.models import Max
from django.conf import settings
from django.core.validators import MinLengthValidator
from django.forms import ValidationError
from django.utils import timezone

class CustomUserManager(BaseUserManager):
    def get_next_employee_id(self):
        # Get the highest employee ID currently in use
        highest_id = self.model.objects.aggregate(
            Max('employee_id'))['employee_id__max']

        if not highest_id:
            return '000001'  # First employee

        next_id = int(highest_id) + 1

        # If next ID would exceed 999999, look for gaps
        if next_id > 999999:
            # Get all employee IDs sorted
            existing_ids = set(self.model.objects.values_list('employee_id', flat=True))

            # Find first available gap
            for i in range(1, 1000000):  # From 000001 to 999999
                candidate = str(i).zfill(6)
                if candidate not in existing_ids:
                    return candidate

            raise ValueError("No available employee IDs - all slots filled")

        # Normal case - return next highest ID
        return str(next_id).zfill(6)

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


class Company(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Companies"
        ordering = ['name']
        db_table = 'django_companies'  # Changed from 'companies'

class Position(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        db_table = 'django_positions'  # Changed from 'positions'

class CustomUser(AbstractUser):
    # Remove the username field
    username = None
    employee_id = models.CharField(unique=True, max_length=6)
    first_name = models.CharField(max_length=100, null=True, blank=True)
    surname = models.CharField(max_length=100, null=True, blank=True)
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True)
    position = models.ForeignKey(Position, on_delete=models.SET_NULL, null=True, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    date_hired = models.DateField(null=True, blank=True)
    pin = models.CharField(
        max_length=4, validators=[MinLengthValidator(4)], null=True, blank=True
    )
    schedule_group = models.ForeignKey(
        'ScheduleGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name="Schedule Group"
    )
    # Remove other redundant fields
    email = None
    last_name = None  # Since you're using 'surname'
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_guard = models.BooleanField(default=False)
    if_first_login = models.BooleanField(default=True)

    USERNAME_FIELD = "employee_id"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    @classmethod
    def authenticate_by_pin(cls, employee_id, pin):
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
        """Get the schedule that applies to this user for the specified day."""
        if self.schedule_group:
            return self.schedule_group.get_schedule_for_day(day_code)
        return None  # No schedule defined

    class Meta:
        db_table = 'django_users'  # Changed from 'users'
        verbose_name = "User"
        verbose_name_plural = "Users"


class TimeEntry(models.Model):
    ordering = ["-time_in"]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    time_in = models.DateTimeField(
        default=timezone.now, editable=True
    )
    time_out = models.DateTimeField(null=True, blank=True)
    hours_worked = models.FloatField(null=True, blank=True)
    is_late = models.BooleanField(default=False)
    last_modified = models.DateTimeField(auto_now=True)
    image_path = models.CharField(max_length=255, null=True, blank=True)

    @property
    def date(self):
        return self.time_in.date()

    def clock_out(self):
        self.time_out = timezone.now()

        if self.time_in and self.time_out:
            delta = self.time_out - self.time_in
            self.hours_worked = round(delta.total_seconds() / 3600, 2)

        # Use user's time preset for lateness check if available
        if self.time_in:
            time_in_local = self.time_in

            if self.user.time_preset:
                expected_start = self.user.time_preset.start_time
            else:
                expected_start = datetime.time(8, 0)  # Default expected start

            self.is_late = time_in_local.time() > expected_start

        self.save()

    @classmethod
    def clock_in(cls, user):
        open_entries = cls.objects.filter(user=user, time_out__isnull=True)
        for entry in open_entries:
            entry.clock_out()

        new_entry = cls.objects.create(user=user)

        # Calculate lateness based on schedule
        time_in_local = new_entry.time_in
        day_of_week = time_in_local.weekday()  # 0=Monday, 6=Sunday
        day_mapping = {0: 'mon', 1: 'tue', 2: 'wed', 3: 'thu', 4: 'fri', 5: 'sat', 6: 'sun'}
        day_code = day_mapping[day_of_week]

        # Get the appropriate schedule
        if user.schedule_group:
            preset = user.schedule_group.get_schedule_for_day(day_code)
            if preset:
                expected_start = preset.start_time
                grace_period = datetime.timedelta(minutes=preset.grace_period_minutes)
            else:
                expected_start = datetime.time(8, 0)  # Default
                grace_period = datetime.timedelta(minutes=5)  # Default
        else:
            expected_start = datetime.time(8, 0)  # Default
            grace_period = datetime.timedelta(minutes=5)  # Default

        expected_start_dt = datetime.datetime.combine(
            time_in_local.date(), expected_start
        )
        expected_start_with_grace = expected_start_dt + grace_period

        new_entry.is_late = time_in_local > expected_start_with_grace
        new_entry.save()

        return new_entry

    def __str__(self):
        return f"{self.user.employee_id} - {self.user.first_name} {self.user.surname} - {self.time_in.strftime('%Y-%m-%d %H:%M:%S')}"

    class Meta:
        verbose_name_plural = "Time Entries"
        db_table = 'django_time_entries'

class Announcement(models.Model):
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_posted = models.BooleanField(default=False)

    def __str__(self):
        return f"Announcement {self.id}"

    class Meta:
        db_table = 'django_announcements'

class TimePreset(models.Model):
    name = models.CharField(max_length=100)
    start_time = models.TimeField()
    end_time = models.TimeField()
    grace_period_minutes = models.IntegerField(default=5)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')})"

    class Meta:
        verbose_name = "Time Preset"
        verbose_name_plural = "Time Presets"
        ordering = ['start_time']

class ScheduleGroup(models.Model):
    name = models.CharField(max_length=100)
    default_schedule = models.ForeignKey(
        'TimePreset',
        on_delete=models.CASCADE,
        related_name='default_for_groups'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name}"

    def get_schedule_for_day(self, day_code):
        """Get the appropriate TimePreset for a specific day"""
        # Check if there's a day-specific override
        try:
            override = self.day_overrides.get(day=day_code)
            return override.time_preset
        except DayOverride.DoesNotExist:
            # If no override exists, return the default schedule
            return self.default_schedule

    class Meta:
        verbose_name = "Schedule Group"
        verbose_name_plural = "Schedule Groups"
        ordering = ['name']

class DayOverride(models.Model):
    DAY_CHOICES = [
        ('mon', 'Monday'),
        ('tue', 'Tuesday'),
        ('wed', 'Wednesday'),
        ('thu', 'Thursday'),
        ('fri', 'Friday'),
        ('sat', 'Saturday'),
        ('sun', 'Sunday'),
    ]

    schedule_group = models.ForeignKey(
        ScheduleGroup,
        on_delete=models.CASCADE,
        related_name='day_overrides'
    )
    day = models.CharField(max_length=3, choices=DAY_CHOICES)
    time_preset = models.ForeignKey(
        'TimePreset',
        on_delete=models.CASCADE,
        related_name='used_in_overrides'
    )

    class Meta:
        verbose_name = "Day Override"
        verbose_name_plural = "Day Overrides"
        unique_together = ['schedule_group', 'day']  # Only one override per day per group