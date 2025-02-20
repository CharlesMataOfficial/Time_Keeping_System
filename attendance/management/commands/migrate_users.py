from django.core.management.base import BaseCommand
from attendance.models import CustomUser, Company, Position
from attendance.users_legacy import UsersLegacy

class Command(BaseCommand):
    help = 'Migrate users from legacy table to Django CustomUser'

    def handle(self, *args, **kwargs):
        legacy_users = UsersLegacy.objects.all()

        # First create companies and positions
        companies = {}
        positions = {}

        for legacy_user in legacy_users:
            if legacy_user.company:
                companies[legacy_user.company] = Company.objects.get_or_create(
                    name=legacy_user.company
                )[0]
            if legacy_user.position:
                positions[legacy_user.position] = Position.objects.get_or_create(
                    name=legacy_user.position
                )[0]

        # Now create users with proper foreign key relationships
        for legacy_user in legacy_users:
            CustomUser.objects.create(
                employee_id=legacy_user.employee_id,
                first_name=legacy_user.first_name,
                surname=legacy_user.surname,
                company=companies.get(legacy_user.company),
                position=positions.get(legacy_user.position),
                birth_date=legacy_user.birth_date,
                date_hired=legacy_user.date_hired,
                pin=legacy_user.pin,
                preset_name=legacy_user.preset_name,
                password='',  # Set empty password
                is_active=legacy_user.status,
                if_first_login=False,
            )

        self.stdout.write(self.style.SUCCESS('Successfully migrated users'))