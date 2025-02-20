from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import (
    User, Company, Position, TimeEntry,
    Announcement, GracePeriod, Preset
)
from attendance.users_legacy import (
    UsersLegacy, EntriesLegacy, CurrentAnnouncementLegacy,
    GracePeriodLegacy, PresetsLegacy
)

class Command(BaseCommand):
    help = 'Migrate all data from legacy tables to Django models'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting migration...')

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
        user_mapping = {}  # To store legacy_user_id -> new_user mapping
        for legacy_user in legacy_users:
            new_user = User.objects.create(
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
            user_mapping[legacy_user.id] = new_user
        self.stdout.write(self.style.SUCCESS('Users migrated successfully'))

        # Migrate entries
        entries = EntriesLegacy.objects.all()
        for entry in entries:
            TimeEntry.objects.create(
                user=user_mapping[entry.user_id],
                time_in=entry.time_in,
                time_out=entry.time_out,
                hours_worked=entry.hours_worked,
                is_late=entry.is_late,
                last_modified=entry.last_modified or timezone.now(),
                image_path=entry.image_path,
            )
        self.stdout.write(self.style.SUCCESS('Entries migrated successfully'))

        # Migrate announcements
        announcements = CurrentAnnouncementLegacy.objects.all()
        for announcement in announcements:
            Announcement.objects.create(
                announcement=announcement.announcement,
                posted_by=announcement.posted_by,
                date_posted=announcement.date_posted,
            )
        self.stdout.write(self.style.SUCCESS('Announcements migrated successfully'))

        # Migrate grace period
        grace_periods = GracePeriodLegacy.objects.all()
        for grace_period in grace_periods:
            GracePeriod.objects.create(
                minutes=grace_period.minutes
            )
        self.stdout.write(self.style.SUCCESS('Grace periods migrated successfully'))

        # Migrate presets
        presets = PresetsLegacy.objects.all()
        for preset in presets:
            Preset.objects.create(
                name=preset.name,
                time_in=preset.time_in,
                time_out=preset.time_out
            )
        self.stdout.write(self.style.SUCCESS('Presets migrated successfully'))

        self.stdout.write(self.style.SUCCESS('All data migrated successfully'))