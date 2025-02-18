# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class CurrentAnnouncement(models.Model):
    id = models.IntegerField(primary_key=True)
    content = models.TextField()

    class Meta:
        managed = False
        db_table = 'current_announcement'


class Entries(models.Model):
    employee_id = models.CharField(max_length=6, blank=True, null=True)
    date = models.DateField(blank=True, null=True)
    time_in = models.TimeField(blank=True, null=True)
    time_out = models.TimeField(blank=True, null=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    is_late = models.CharField(max_length=10, blank=True, null=True)
    edited = models.IntegerField(blank=True, null=True)
    edited_by_id = models.CharField(max_length=6, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'entries'


class GracePeriod(models.Model):
    id = models.IntegerField(primary_key=True)
    grace_time = models.TimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'grace_period'


class Presets(models.Model):
    name = models.CharField(max_length=100)
    preset_type = models.CharField(max_length=7)
    monday_start = models.TimeField(blank=True, null=True)
    monday_end = models.TimeField(blank=True, null=True)
    monday_check = models.IntegerField(blank=True, null=True)
    tuesday_start = models.TimeField(blank=True, null=True)
    tuesday_end = models.TimeField(blank=True, null=True)
    tuesday_check = models.IntegerField(blank=True, null=True)
    wednesday_start = models.TimeField(blank=True, null=True)
    wednesday_end = models.TimeField(blank=True, null=True)
    wednesday_check = models.IntegerField(blank=True, null=True)
    thursday_start = models.TimeField(blank=True, null=True)
    thursday_end = models.TimeField(blank=True, null=True)
    thursday_check = models.IntegerField(blank=True, null=True)
    friday_start = models.TimeField(blank=True, null=True)
    friday_end = models.TimeField(blank=True, null=True)
    friday_check = models.IntegerField(blank=True, null=True)
    saturday_start = models.TimeField(blank=True, null=True)
    saturday_end = models.TimeField(blank=True, null=True)
    saturday_check = models.IntegerField(blank=True, null=True)
    sunday_start = models.TimeField(blank=True, null=True)
    sunday_end = models.TimeField(blank=True, null=True)
    sunday_check = models.IntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'presets'