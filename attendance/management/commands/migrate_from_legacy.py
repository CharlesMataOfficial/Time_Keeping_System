from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, time
from attendance.models import (
    CustomUser, Company, Position, TimeEntry,
    Announcement, TimePreset, ScheduleGroup, Department
)
from attendance.database_legacy import (
    UsersLegacy, EntriesLegacy, PresetsLegacy
)
from attendance.utils import STANDARD_DEPARTMENTS  # Import from utils.py

class Command(BaseCommand):
    help = 'Migrate all data from legacy tables to Django models'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting migration...')
        Company.objects.all().delete()
        Position.objects.all().delete()
        TimeEntry.objects.all().delete()
        Announcement.objects.all().delete()
        TimePreset.objects.all().delete()
        ScheduleGroup.objects.all().delete()
        Department.objects.all().delete()

        # First create companies and positions
        companies = {}
        positions = {}
        
        # Create all standard departments first
        self.stdout.write('Creating standard departments...')
        departments = {}
        
        for dept_name in STANDARD_DEPARTMENTS:
            department, created = Department.objects.get_or_create(name=dept_name)
            departments[dept_name] = department

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created department: {dept_name}'))
        else:
            self.stdout.write(self.style.WARNING(f'Department "{dept_name}" already exists, skipping.'))

        # Manual department assignments based on provided list
        manual_departments = {
        '000003': 'Sales',
        '000302': 'Operations - Mindanao',
        '000310': 'Sales - Mindanao',
        '777777': 'Support - Supply Management',
        '000265': 'Sales - Mindanao',
        '000327': 'Sales - Mindanao',
        '000360': 'Sales - Mindanao',
        '000086': 'Academy',
        '000166': 'Academy',
        '000001': 'Office of the CEO',
        '000002': 'Office of the COO',
        '000005': 'Support - General Services',
        '000042': 'Technical SFGC',
        '000006': 'Support - ICT',
        '000011': 'Support - ICT',
        '000029': 'Support - Admin',
        '000030': 'Support - Admin',
        '000064': 'Support - Finance',
        '000087': 'Support - Finance',
        '666666': 'Support - Admin - Luzon',
        '000149': 'Support - Supply Management',
        '000151': 'Support - Admin',
        '000164': 'Support - Supply Management',
        '000182': 'Support - Finance',
        '000195': 'Support - Finance',
        '000216': 'Support - Finance',
        '000252': 'Support - Supply Management',
        '000258': 'Support - Finance',
        '000259': 'Support - ICT',
        '000298': 'Support - HR',
        '000300': 'Support - HR',
        '000314': 'Support - Finance',
        '000331': 'Support - Finance',
        '000332': 'Support - Supply',
        '000338': 'Support - Admin',
        '000343': 'Support - Finance',
        '000373': 'Support - Finance',
        '000379': 'Support - Supply Management',
        }
        
        # Ensure all manual departments exist in the departments dictionary
        for dept_name in manual_departments.values():
            if dept_name not in departments:
                department, created = Department.objects.get_or_create(name=dept_name)
                departments[dept_name] = department

        # Get legacy users data
        legacy_users = UsersLegacy.objects.all()
        for legacy_user in legacy_users:
            if legacy_user.company:
                companies[legacy_user.company] = Company.objects.get_or_create(
                    name=legacy_user.company
                )[0]
            if legacy_user.position:
                # This will only create positions not already created above
                positions[legacy_user.position] = Position.objects.get_or_create(
                    name=legacy_user.position
                )[0]              
            
            # Assign manually if user ID exists in the mapping dictionary
            if legacy_user.employee_id in manual_departments:
                department_instance = departments.get(manual_departments[legacy_user.employee_id], None)            
            
        # Create TimePresets and ScheduleGroups
        presets = {}
        legacy_presets = PresetsLegacy.objects.all()
        for legacy_preset in legacy_presets:
            preset_name = legacy_preset.name
            if preset_name in presets:
                self.stdout.write(self.style.WARNING(
                    f"Duplicate preset name {preset_name} found, skipping."
                ))
                continue

            time_preset = TimePreset.objects.create(
                name=preset_name,
                start_time=legacy_preset.monday_start or time(8, 0),
                end_time=legacy_preset.monday_end or time(17, 0),
                grace_period_minutes=5  # Default grace period
            )
            presets[preset_name] = time_preset

            ScheduleGroup.objects.create(
                name=preset_name,
                default_schedule=time_preset
            )

        # Create users with proper foreign key relationships
        user_mapping = {}  # To store employee_id -> new_user mapping
        for legacy_user in legacy_users:
            schedule_group = None
            if legacy_user.preset_name:
                schedule_group = ScheduleGroup.objects.get(name=legacy_user.preset_name)
            
            # Default to None (blank) if not manually assigned
            department_instance = None

            # Assign manually if user ID exists in the mapping dictionary
            if legacy_user.employee_id in manual_departments:
                department_instance = departments.get(manual_departments[legacy_user.employee_id], None)

            new_user = CustomUser.objects.create(
                employee_id=legacy_user.employee_id,
                first_name=legacy_user.first_name,
                surname=legacy_user.surname,
                company=companies.get(legacy_user.company),
                position=positions.get(legacy_user.position),
                department=department_instance,  # Now defaults to None if not found
                birth_date=legacy_user.birth_date,
                date_hired=legacy_user.date_hired,
                pin=legacy_user.pin,
                password='',
                is_active=bool(legacy_user.status),
                if_first_login=False,
                schedule_group=schedule_group
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
                        f"User with employee_id {employee_id} not found, skipping entry."
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
                self.stdout.write(self.style.ERROR(f"Error migrating entry {entry.id}: {e}"))

        self.stdout.write(self.style.SUCCESS('Entries migrated successfully'))
        self.stdout.write(self.style.SUCCESS('All data migrated successfully'))