from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime
from attendance.models import (
    CustomUser, Company, Position, TimeEntry,
    Announcement
)
from attendance.database_legacy import (
    UsersLegacy, EntriesLegacy
)

class Command(BaseCommand):
    help = 'Migrate all data from legacy tables to Django models'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting migration...')

        self.stdout.write('Clearing existing data...')
        Company.objects.all().delete()
        Position.objects.all().delete()
        TimeEntry.objects.all().delete()
        Announcement.objects.all().delete()
        CustomUser.objects.exclude(is_superuser=True).delete()  # Keep superusers

        # First create companies and positions
        companies = {}
        positions = {}

        legacy_users = UsersLegacy.objects.all()
        for legacy_user in legacy_users:
            if legacy_user.company:
                companies[legacy_user.company] = Company.objects.get_or_create(
                    name=legacy_user.company
                )[0]
            if legacy_user.position:
                positions[legacy_user.position] = Position.objects.get_or_create(
                    name=legacy_user.position
                )[0]

        # Create users with proper foreign key relationships
        user_mapping = {}  # To store employee_id -> new_user mapping
        for legacy_user in legacy_users:
            new_user = CustomUser.objects.create(
                employee_id=legacy_user.employee_id,
                first_name=legacy_user.first_name,
                surname=legacy_user.surname,
                company=companies.get(legacy_user.company),
                position=positions.get(legacy_user.position),
                birth_date=legacy_user.birth_date,
                date_hired=legacy_user.date_hired,
                pin=legacy_user.pin,
                preset_name=legacy_user.preset_name,
                password='',
                is_active=bool(legacy_user.status),
                if_first_login=False,
            )
            user_mapping[legacy_user.employee_id] = new_user  # Map by employee_id instead of id
        self.stdout.write(self.style.SUCCESS('Users migrated successfully'))

        # Migrate entries
        entries = EntriesLegacy.objects.all()
        for entry in entries:
            try:
                # Use the raw foreign key value instead of entry.user.employee_id
                employee_id = entry.employee_id  # This gives you the value of the employee_id column.
                user = user_mapping.get(employee_id)
                if not user:
                    self.stdout.write(self.style.WARNING(
                        f'User mapping not found for employee_id: {employee_id}'
                    ))
                    continue

                # For time_in
                if entry.time_in:
                    time_in = datetime.combine(entry.date, entry.time_in)
                else:
                    time_in = None

                # For time_out
                if entry.time_out:
                    time_out = datetime.combine(entry.date, entry.time_out)
                else:
                    time_out = None

                TimeEntry.objects.create(
                    user=user,
                    time_in=time_in,
                    time_out=time_out,
                    hours_worked=entry.hours_worked,
                    is_late=entry.is_late.lower() == 'true',
                    last_modified=timezone.now().replace(tzinfo=None),
                    image_path=None,
                )

            except Exception as e:
                self.stdout.write(self.style.WARNING(
                    f'Error creating entry for employee_id {employee_id}: {str(e)}'
                ))
                continue

        self.stdout.write(self.style.SUCCESS('Entries migrated successfully'))
        self.stdout.write(self.style.SUCCESS('All data migrated successfully'))