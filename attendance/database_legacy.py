from django.db import models

class UsersLegacy(models.Model):
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
        managed = False
        db_table = 'users'

class EntriesLegacy(models.Model):
    employee_id = models.CharField(max_length=6, db_column='employee_id')
    date = models.DateField()
    time_in = models.TimeField(blank=True, null=True)
    time_out = models.TimeField(blank=True, null=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    is_late = models.CharField(max_length=10, blank=True, null=True)
    edited = models.BooleanField(default=False)
    edited_by_id = models.CharField(max_length=6, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'entries'