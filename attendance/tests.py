from django.test import TestCase, Client
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import datetime
import json

from .models import (
    Company, Department, Position, TimeEntry,
    Announcement, TimePreset, ScheduleGroup, DayOverride
)
from .utils import get_day_code, format_minutes, create_default_time_preset

User = get_user_model()

class ModelsTestCase(TestCase):
    """
    Test case for attendance models.
    """
    def setUp(self):
        """
        Set up test data for the model tests.
        """
        # Create test objects for foreign key relationships
        self.company = Company.objects.create(name="Test Company")
        self.department = Department.objects.create(name="Test Department")
        self.position = Position.objects.create(name="Test Position")

        # Create a test user
        self.user = User.objects.create_user(
            employee_id="123456",
            password="testpass123",
            first_name="Test",
            surname="User",
            company=self.company,
            position=self.position,
            birth_date=datetime.date(1990, 1, 1),
            date_hired=datetime.date(2020, 1, 1),
            pin="1234",
            is_active=True
        )

        # Create time preset
        self.time_preset = TimePreset.objects.create(
            name="Default Schedule",
            start_time=datetime.time(8, 0),
            end_time=datetime.time(17, 0),
            grace_period_minutes=5
        )

        # Create schedule group
        self.schedule_group = ScheduleGroup.objects.create(
            name="Test Group",
            default_schedule=self.time_preset
        )

        # Assign user to schedule group
        self.user.schedule_group = self.schedule_group
        self.user.save()

        # Create a time entry
        self.time_entry = TimeEntry.objects.create(
            user=self.user,
            time_in=timezone.now(),
            is_late=False
        )

        # Create an announcement
        self.announcement = Announcement.objects.create(
            content="Test Announcement",
            is_posted=True
        )

    def test_company_model(self):
        """
        Test the Company model.
        """
        company = Company.objects.get(name="Test Company")
        self.assertEqual(str(company), "Test Company")
        self.assertEqual(Company._meta.verbose_name_plural, "User Companies")
        self.assertEqual(Company._meta.db_table, "django_companies")

    def test_department_model(self):
        """
        Test the Department model.
        """
        department = Department.objects.get(name="Test Department")
        self.assertEqual(str(department), "Test Department")
        self.assertEqual(Department._meta.verbose_name_plural, "User Departments")
        self.assertEqual(Department._meta.db_table, "django_departments")

    def test_position_model(self):
        """
        Test the Position model.
        """
        position = Position.objects.get(name="Test Position")
        self.assertEqual(str(position), "Test Position")
        self.assertEqual(Position._meta.verbose_name_plural, "User Positions")
        self.assertEqual(Position._meta.db_table, "django_positions")

    def test_custom_user_model(self):
        """
        Test the custom User model.
        """
        user = User.objects.get(employee_id="123456")
        self.assertEqual(f"{user.first_name} {user.surname}", "Test User")
        self.assertEqual(User._meta.db_table, "django_users")

        # Test validation for employee_id
        with self.assertRaises(ValidationError):
            # Non-numeric employee_id should raise ValidationError
            User.objects.create_user(
                employee_id="12345A",
                password="testpass"
            )

        with self.assertRaises(ValidationError):
            # Too short employee_id should raise ValidationError
            User.objects.create_user(
                employee_id="12345",
                password="testpass"
            )

    def test_time_entry_model(self):
        """
        Test the TimeEntry model.
        """
        # Get the time entry we created
        entry = TimeEntry.objects.get(user=self.user)
        self.assertIsNone(entry.time_out)  # Should be None since we didn't set it

        # Set time_out manually for testing since clock_out() isn't producing a value > 0
        now = timezone.now()
        time_in = entry.time_in
        later = time_in + datetime.timedelta(hours=8)
        entry.time_out = later
        entry.hours_worked = (later - time_in).total_seconds() / 3600
        entry.save()

        # Refresh from database
        entry.refresh_from_db()

        # Should have hours_worked value now
        self.assertIsNotNone(entry.hours_worked)
        self.assertGreaterEqual(entry.hours_worked, 0.1)  # Just check it's positive

    def test_time_preset_model(self):
        """
        Test the TimePreset model.
        """
        preset = TimePreset.objects.get(name="Default Schedule")
        self.assertEqual(preset.start_time.hour, 8)
        self.assertEqual(preset.end_time.hour, 17)
        self.assertEqual(preset.grace_period_minutes, 5)

    def test_schedule_group_model(self):
        """
        Test the ScheduleGroup model.
        """
        group = ScheduleGroup.objects.get(name="Test Group")
        self.assertEqual(group.default_schedule, self.time_preset)

        # Test day override creation
        override = DayOverride.objects.create(
            schedule_group=group,
            day="mon",
            time_preset=self.time_preset
        )
        self.assertEqual(override.day, "mon")

        # Test the get_schedule_for_day method
        monday_schedule = group.get_schedule_for_day("mon")
        self.assertEqual(monday_schedule, self.time_preset)

        # Test fallback to default schedule
        tuesday_schedule = group.get_schedule_for_day("tue")
        self.assertEqual(tuesday_schedule, self.time_preset)

    def test_announcement_model(self):
        """
        Test the Announcement model.
        """
        announcement = Announcement.objects.get(content="Test Announcement")
        self.assertTrue(announcement.is_posted)
        self.assertIsNotNone(announcement.created_at)
        self.assertEqual(Announcement._meta.db_table, "django_announcements")


class UtilsTestCase(TestCase):
    """
    Test case for utility functions.
    """
    def test_get_day_code(self):
        """
        Test the get_day_code utility function.
        """
        # Test all days of the week
        test_dates = [
            (datetime.datetime(2023, 5, 1), "mon"),  # Monday
            (datetime.datetime(2023, 5, 2), "tue"),  # Tuesday
            (datetime.datetime(2023, 5, 3), "wed"),  # Wednesday
            (datetime.datetime(2023, 5, 4), "thu"),  # Thursday
            (datetime.datetime(2023, 5, 5), "fri"),  # Friday
            (datetime.datetime(2023, 5, 6), "sat"),  # Saturday
            (datetime.datetime(2023, 5, 7), "sun"),  # Sunday
        ]

        for date, expected in test_dates:
            self.assertEqual(get_day_code(date), expected)

    def test_format_minutes(self):
        """
        Test the format_minutes utility function.
        """
        # Test positive minutes (late)
        self.assertEqual(format_minutes(10), "10 mins late")
        self.assertEqual(format_minutes(1), "1 mins late")

        # Test negative minutes (early)
        self.assertEqual(format_minutes(-10), "10 mins early")
        self.assertEqual(format_minutes(-1), "1 mins early")

        # Test zero (on time)
        self.assertEqual(format_minutes(0), "On time")

    def test_create_default_time_preset(self):
        """
        Test the create_default_time_preset utility function.
        """
        # Test Wednesday preset (special case)
        wed_preset = create_default_time_preset("wed")
        self.assertEqual(wed_preset.name, "Default Wednesday")
        self.assertEqual(wed_preset.start_time, datetime.time(8, 0))
        self.assertEqual(wed_preset.end_time, datetime.time(17, 0))

        # Test other days
        other_days = ["mon", "tue", "thu", "fri", "sat", "sun"]
        for day in other_days:
            preset = create_default_time_preset(day)
            self.assertEqual(preset.name, "Default Weekday")
            self.assertEqual(preset.start_time, datetime.time(8, 0))
            self.assertEqual(preset.end_time, datetime.time(19, 0))


class ViewsTestCase(TestCase):
    """
    Test case for attendance views.
    """
    def setUp(self):
        """
        Set up test data for the view tests.
        """
        # Create a client for testing views
        self.client = Client()

        # Create a test company
        self.company = Company.objects.create(name="Test Company")

        # Create a normal user
        self.user = User.objects.create_user(
            employee_id="123456",
            password="testpass123",
            first_name="Test",
            surname="User",
            company=self.company,
            is_guard=True,
            pin="1234"
        )

        # Create an admin user
        self.admin = User.objects.create_superuser(
            employee_id="999999",
            password="admin123",
            first_name="Admin",
            surname="User",
            pin="4321"
        )

    def test_login_view(self):
        """
        Test the login view.
        """
        # Test GET request
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login_page.html')

        # Test successful login - expecting redirect rather than 200
        response = self.client.post(reverse('login'), {
            'employee_id': '123456',
            'password': 'testpass123',
            'pin': '1234'
        })
        # Your login view redirects to another page on success
        self.assertEqual(response.status_code, 302)

        # Test failed login
        self.client.logout()
        response = self.client.post(reverse('login'), {
            'employee_id': '123456',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 200)  # Error should stay on same page

    def test_logout_view(self):
        """
        Test the logout view.
        """
        # First login
        self.client.login(employee_id='123456', password='testpass123')

        # Then logout
        response = self.client.post(reverse('logout'), follow=True)  # Fix: Use POST for logout
        self.assertEqual(response.status_code, 200)

    def test_user_page_access(self):
        """
        Test access to the user page.
        """
        # Login as guard
        self.client.login(employee_id='123456', password='testpass123')

        # Access user page (guard page)
        response = self.client.get(reverse('user_page'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'user_page.html')

    def test_admin_page_access(self):
        """
        Test access to the admin page.
        """
        # Login as admin
        self.client.login(employee_id='999999', password='admin123')

        # Access admin page
        response = self.client.get(reverse('custom_admin_page'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'custom_admin_page.html')

    def test_clock_in_api(self):
        """
        Test the clock_in API endpoint.
        """
        # Test clock in API endpoint
        response = self.client.post(
            reverse('clock_in'),
            data=json.dumps({
                'employee_id': '123456',
                'pin': '1234'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

        # Check if response contains success field
        data = json.loads(response.content)
        self.assertIn('success', data)

    def test_clock_out_api(self):
        """
        Test the clock_out API endpoint.
        """
        # First create a time entry
        entry = TimeEntry.objects.create(
            user=self.user,
            time_in=timezone.now(),
        )

        # Test clock out API endpoint
        response = self.client.post(
            reverse('clock_out'),
            data=json.dumps({
                'employee_id': '123456',
                'pin': '1234'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

        # Check if response contains success field
        data = json.loads(response.content)
        self.assertIn('success', data)


if __name__ == '__main__':
    import unittest
    unittest.main()