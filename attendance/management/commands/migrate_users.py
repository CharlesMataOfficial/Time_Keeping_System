from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password  # For password hashing
from attendance.models import CustomUser
from attendance.users_legacy import UsersLegacy

class Command(BaseCommand):
    help = 'Migrate users from legacy table to Django CustomUser'

    def handle(self, *args, **kwargs):
        legacy_users = UsersLegacy.objects.all()

        for legacy_user in legacy_users:
            pin_password = legacy_user.pin
            # Hash the password properly
            hashed_password = make_password(pin_password)

            CustomUser.objects.create(
                employee_id=legacy_user.employee_id,
                first_name=legacy_user.first_name,
                surname=legacy_user.surname,
                company=legacy_user.company,
                position=legacy_user.position,
                birth_date=legacy_user.birth_date,
                date_hired=legacy_user.date_hired,
                pin=legacy_user.pin,
                preset_name=legacy_user.preset_name,
                password=hashed_password,  # Hashed password
                is_active=legacy_user.status,  # Ensure users are active
                if_first_login=False,
            )

        self.stdout.write(self.style.SUCCESS('Successfully migrated users'))