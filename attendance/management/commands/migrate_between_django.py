from django.core.management.base import BaseCommand
from django.db import connections
from django.conf import settings
from django.utils import timezone
from attendance.models import (
    CustomUser, TimeEntry, Company, Position, Department,
    ScheduleGroup, TimePreset, Announcement, AdminLog, DayOverride
)

class Command(BaseCommand):
    """
    Migrates data from one Django system to another.
    """
    help = 'Migrate data from source Django database to current database'

    def add_arguments(self, parser):
        parser.add_argument('--source', type=str, required=True, help='Source database alias from settings.DATABASES')
        parser.add_argument('--skip-users', action='store_true', help='Skip migrating users')
        parser.add_argument('--skip-time-entries', action='store_true', help='Skip migrating time entries')
        parser.add_argument('--skip-companies', action='store_true', help='Skip migrating companies')
        parser.add_argument('--skip-positions', action='store_true', help='Skip migrating positions')
        parser.add_argument('--skip-departments', action='store_true', help='Skip migrating departments')
        parser.add_argument('--skip-schedules', action='store_true', help='Skip migrating schedules')
        parser.add_argument('--skip-announcements', action='store_true', help='Skip migrating announcements')

    def handle(self, *args, **options):
        source_db = options['source']

        # Check if source database is configured
        if source_db not in settings.DATABASES:
            self.stdout.write(self.style.ERROR(f"Source database '{source_db}' not configured in settings.DATABASES"))
            return

        self.stdout.write(self.style.SUCCESS('Starting Django-to-Django migration...'))

        # Migrate in the proper order to respect foreign key relationships
        if not options['skip_companies']:
            self.migrate_companies(source_db)

        if not options['skip_positions']:
            self.migrate_positions(source_db)

        if not options['skip_departments']:
            self.migrate_departments(source_db)

        if not options['skip_schedules']:
            self.migrate_time_presets(source_db)
            self.migrate_schedule_groups(source_db)

        if not options['skip_users']:
            self.migrate_users(source_db)

        if not options['skip_time_entries']:
            self.migrate_time_entries(source_db)

        if not options['skip_announcements']:
            self.migrate_announcements(source_db)

        self.stdout.write(self.style.SUCCESS('Migration completed successfully'))

    def migrate_companies(self, source_db):
        """Migrate companies from source database"""
        self.stdout.write('Migrating companies...')
        companies = Company.objects.using(source_db).all()
        self.stdout.write(f'Found {companies.count()} companies in source database')

        for company in companies:
            try:
                Company.objects.get_or_create(
                    name=company.name
                )
                self.stdout.write(f"Migrated company: {company.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating company {company.name}: {e}"))

    def migrate_positions(self, source_db):
        """Migrate positions from source database"""
        self.stdout.write('Migrating positions...')
        positions = Position.objects.using(source_db).all()
        self.stdout.write(f'Found {positions.count()} positions in source database')

        for position in positions:
            try:
                Position.objects.get_or_create(
                    name=position.name
                )
                self.stdout.write(f"Migrated position: {position.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating position {position.name}: {e}"))

    def migrate_departments(self, source_db):
        """Migrate departments from source database"""
        self.stdout.write('Migrating departments...')
        departments = Department.objects.using(source_db).all()
        self.stdout.write(f'Found {departments.count()} departments in source database')

        for department in departments:
            try:
                Department.objects.get_or_create(
                    name=department.name
                )
                self.stdout.write(f"Migrated department: {department.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating department {department.name}: {e}"))

    def migrate_time_presets(self, source_db):
        """Migrate time presets from source database"""
        self.stdout.write('Migrating time presets...')
        presets = TimePreset.objects.using(source_db).all()
        self.stdout.write(f'Found {presets.count()} time presets in source database')

        preset_mapping = {}
        for preset in presets:
            try:
                new_preset, created = TimePreset.objects.get_or_create(
                    name=preset.name,
                    defaults={
                        'start_time': preset.start_time,
                        'end_time': preset.end_time,
                        'grace_period_minutes': preset.grace_period_minutes
                    }
                )
                if not created:
                    # Update existing preset
                    new_preset.start_time = preset.start_time
                    new_preset.end_time = preset.end_time
                    new_preset.grace_period_minutes = preset.grace_period_minutes
                    new_preset.save()

                preset_mapping[preset.id] = new_preset
                self.stdout.write(f"Migrated time preset: {preset.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating time preset {preset.name}: {e}"))

        return preset_mapping

    def migrate_schedule_groups(self, source_db):
        """Migrate schedule groups from source database"""
        self.stdout.write('Migrating schedule groups...')
        groups = ScheduleGroup.objects.using(source_db).all()
        self.stdout.write(f'Found {groups.count()} schedule groups in source database')

        preset_mapping = {p.id: p for p in TimePreset.objects.all()}
        source_presets = {p.id: p for p in TimePreset.objects.using(source_db).all()}

        for group in groups:
            try:
                default_schedule = None
                if group.default_schedule:
                    # Find the matching preset in the target database
                    source_preset = source_presets.get(group.default_schedule.id)
                    if source_preset:
                        try:
                            default_schedule = TimePreset.objects.get(name=source_preset.name)
                        except TimePreset.DoesNotExist:
                            self.stdout.write(self.style.WARNING(f"Default schedule {source_preset.name} not found in target database"))

                new_group, created = ScheduleGroup.objects.get_or_create(
                    name=group.name,
                    defaults={'default_schedule': default_schedule}
                )
                if not created:
                    new_group.default_schedule = default_schedule
                    new_group.save()

                # Migrate day overrides
                for override in DayOverride.objects.using(source_db).filter(schedule_group_id=group.id):
                    time_preset = None
                    if override.time_preset:
                        source_preset = source_presets.get(override.time_preset.id)
                        if source_preset:
                            try:
                                time_preset = TimePreset.objects.get(name=source_preset.name)
                            except TimePreset.DoesNotExist:
                                pass

                    DayOverride.objects.get_or_create(
                        schedule_group=new_group,
                        day=override.day,
                        defaults={'time_preset': time_preset}
                    )

                self.stdout.write(f"Migrated schedule group: {group.name}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating schedule group {group.name}: {e}"))

    def migrate_users(self, source_db):
        """
        Migrate users from source Django database to current database
        """
        self.stdout.write('Migrating users...')
        source_users = CustomUser.objects.using(source_db).all()
        self.stdout.write(f'Found {source_users.count()} users in source database')

        # Create mappings for related objects
        companies_map = {c.name: c for c in Company.objects.all()}
        positions_map = {p.name: p for p in Position.objects.all()}
        departments_map = {d.name: d for d in Department.objects.all()}
        schedules_map = {s.name: s for s in ScheduleGroup.objects.all()}

        # Create mapping of source users to target users for later use with relationships
        user_mapping = {}

        for source_user in source_users:
            try:
                # Get related objects from mappings
                company = None
                if source_user.company:
                    company = companies_map.get(source_user.company.name)

                position = None
                if source_user.position:
                    position = positions_map.get(source_user.position.name)

                department = None
                if source_user.department:
                    department = departments_map.get(source_user.department.name)

                schedule_group = None
                if source_user.schedule_group:
                    schedule_group = schedules_map.get(source_user.schedule_group.name)

                # Check if user already exists
                try:
                    existing_user = CustomUser.objects.get(employee_id=source_user.employee_id)
                    # Update existing user
                    existing_user.username = source_user.employee_id  # Fix username issue
                    existing_user.first_name = source_user.first_name
                    existing_user.surname = source_user.surname
                    existing_user.company = company
                    existing_user.position = position
                    existing_user.department = department
                    existing_user.birth_date = source_user.birth_date
                    existing_user.date_hired = source_user.date_hired
                    existing_user.pin = source_user.pin
                    existing_user.is_active = source_user.is_active
                    existing_user.is_staff = source_user.is_staff
                    existing_user.is_superuser = source_user.is_superuser
                    existing_user.is_guard = source_user.is_guard
                    existing_user.is_hr = source_user.is_hr
                    existing_user.if_first_login = source_user.if_first_login
                    existing_user.leave_credits = source_user.leave_credits
                    existing_user.schedule_group = schedule_group

                    # Set password if not already set
                    if not existing_user.password:
                        existing_user.set_password("0000")

                    existing_user.save()
                    user_mapping[source_user.id] = existing_user
                    self.stdout.write(self.style.WARNING(f"Updated existing user: {source_user.employee_id}"))
                except CustomUser.DoesNotExist:
                    # Create new user
                    new_user = CustomUser(
                        employee_id=source_user.employee_id,
                        username=source_user.employee_id,
                        first_name=source_user.first_name,
                        surname=source_user.surname,
                        company=company,
                        position=position,
                        department=department,
                        birth_date=source_user.birth_date,
                        date_hired=source_user.date_hired,
                        pin=source_user.pin,
                        is_active=source_user.is_active,
                        is_staff=source_user.is_staff,
                        is_superuser=source_user.is_superuser,
                        is_guard=source_user.is_guard,
                        is_hr=source_user.is_hr,
                        if_first_login=source_user.if_first_login,
                        leave_credits=source_user.leave_credits,
                        schedule_group=schedule_group
                    )
                    # Set a default password
                    new_user.set_password("0000")
                    new_user.save()
                    user_mapping[source_user.id] = new_user
                    self.stdout.write(self.style.SUCCESS(f"Created user: {source_user.employee_id}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating user {source_user.employee_id}: {e}"))

        # Handle manager relationships in a second pass
        for source_user in source_users:
            if source_user.manager_id:
                try:
                    target_user = user_mapping.get(source_user.id)
                    target_manager = user_mapping.get(source_user.manager_id)
                    if target_user and target_manager:
                        target_user.manager = target_manager
                        target_user.save(update_fields=['manager'])
                except Exception as e:
                    self.stdout.write(self.style.ERROR(
                        f"Error setting manager for user {source_user.employee_id}: {e}"
                    ))

        return user_mapping

    def migrate_time_entries(self, source_db):
        """Migrate time entries from source database"""
        self.stdout.write('Migrating time entries...')

        # Get mapping of users from source to target
        source_users = {u.employee_id: u for u in CustomUser.objects.using(source_db).all()}
        target_users = {u.employee_id: u for u in CustomUser.objects.all()}

        # Process time entries in chunks to avoid memory issues
        offset = 0
        limit = 1000
        while True:
            entries = TimeEntry.objects.using(source_db).all()[offset:offset+limit]
            if not entries:
                break

            for entry in entries:
                try:
                    source_user = source_users.get(entry.user.employee_id)
                    if not source_user:
                        self.stdout.write(self.style.WARNING(f"Source user not found for time entry: {entry.id}"))
                        continue

                    target_user = target_users.get(source_user.employee_id)
                    if not target_user:
                        self.stdout.write(self.style.WARNING(f"Target user not found for time entry: {entry.id}"))
                        continue

                    # Check if entry already exists
                    existing = TimeEntry.objects.filter(
                        user=target_user,
                        time_in=entry.time_in
                    ).first()

                    if existing:
                        # Update existing entry
                        existing.time_out = entry.time_out
                        existing.hours_worked = entry.hours_worked
                        existing.is_late = entry.is_late
                        existing.minutes_late = entry.minutes_late
                        existing.image_path = entry.image_path
                        existing.save()
                    else:
                        # Create new entry
                        TimeEntry.objects.create(
                            user=target_user,
                            time_in=entry.time_in,
                            time_out=entry.time_out,
                            hours_worked=entry.hours_worked,
                            is_late=entry.is_late,
                            minutes_late=entry.minutes_late,
                            image_path=entry.image_path
                        )
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error migrating time entry {entry.id}: {e}"))

            self.stdout.write(f"Migrated {len(entries)} time entries")
            offset += limit

    def migrate_announcements(self, source_db):
        """Migrate announcements from source database"""
        self.stdout.write('Migrating announcements...')
        announcements = Announcement.objects.using(source_db).all()
        self.stdout.write(f'Found {announcements.count()} announcements in source database')

        for announcement in announcements:
            try:
                Announcement.objects.get_or_create(
                    content=announcement.content,
                    is_posted=announcement.is_posted,
                    defaults={
                        'created_at': announcement.created_at or timezone.now()
                    }
                )
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error migrating announcement: {e}"))