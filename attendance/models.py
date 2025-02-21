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
    preset_name = models.CharField(max_length=100, null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_guard = models.BooleanField(default=False)
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