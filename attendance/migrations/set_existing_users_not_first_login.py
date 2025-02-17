from django.db import migrations

def set_existing_users_not_first_login(apps, schema_editor):
    CustomUser = apps.get_model('attendance', 'CustomUser')
    # Set if_first_login to False for all existing users
    CustomUser.objects.all().update(if_first_login=False)

class Migration(migrations.Migration):
    dependencies = [
        ('attendance', '0002_customuser_if_first_login_customuser_status_and_more'),  # Update this to your last migration
    ]

    operations = [
        migrations.RunPython(set_existing_users_not_first_login),
    ]