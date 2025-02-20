from django.db import models

class UsersLegacy(models.Model):  # Class name MUST match the import
    employee_id = models.CharField(unique=True, max_length=6)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    surname = models.CharField(max_length=100, blank=True, null=True)
    company = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    date_hired = models.DateField(blank=True, null=True)
    pin = models.CharField(max_length=4, blank=True, null=True)
    status = models.IntegerField(blank=True, null=True)
    preset_name = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False  # Ensure this line exists
        db_table = 'users'  # Maps to your legacy table

class EntriesLegacy(models.Model):
    user = models.ForeignKey(UsersLegacy, on_delete=models.CASCADE)
    time_in = models.DateTimeField()
    time_out = models.DateTimeField(blank=True, null=True)
    hours_worked = models.FloatField(blank=True, null=True)
    is_late = models.BooleanField(default=False)
    last_modified = models.DateTimeField(auto_now=True)
    image_path = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'entries'

class CurrentAnnouncementLegacy(models.Model):
    announcement = models.TextField()
    posted_by = models.CharField(max_length=100)
    date_posted = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = False
        db_table = 'current_announcement'

class GracePeriodLegacy(models.Model):
    minutes = models.IntegerField()

    class Meta:
        managed = False
        db_table = 'grace_period'

class PresetsLegacy(models.Model):
    name = models.CharField(max_length=100)
    time_in = models.TimeField()
    time_out = models.TimeField()

    class Meta:
        managed = False
        db_table = 'presets'