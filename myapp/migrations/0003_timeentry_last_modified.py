# Generated by Django 5.1.5 on 2025-02-11 11:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0002_alter_customuser_employee_id_alter_customuser_pin'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeentry',
            name='last_modified',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
