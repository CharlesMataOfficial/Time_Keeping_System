from django.core.management.base import BaseCommand
from attendance.models import CustomUser, Leave, LeaveType
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    """
    Creates test data for the leave approval system.
    """
    help = 'Creates test data for leave approval system'

    def handle(self, *args, **kwargs):
        """
        Handles the creation of leave test data.
        """
        # Create leave types
        vacation, _ = LeaveType.objects.get_or_create(name="Vacation Leave", defaults={'is_paid': True})
        sick, _ = LeaveType.objects.get_or_create(name="Sick Leave", defaults={'is_paid': True})
        emergency, _ = LeaveType.objects.get_or_create(name="Emergency Leave", defaults={'is_paid': True})

        # Find or create manager and HR roles
        try:
            manager = CustomUser.objects.get(employee_id='100001')
            # Update existing manager properties
            manager.first_name = 'Manager'
            manager.surname = 'Test'
            manager.is_active = True
            manager.save()
        except CustomUser.DoesNotExist:
            manager = CustomUser.objects.create(
                employee_id='100001',
                first_name='Manager',
                surname='Test',
                pin='0000',
                is_active=True
            )

        try:
            hr_user = CustomUser.objects.get(employee_id='100002')
            # Update existing HR properties
            hr_user.first_name = 'HR'
            hr_user.surname = 'Person'
            hr_user.is_hr = True
            hr_user.is_active = True
            hr_user.save()
        except CustomUser.DoesNotExist:
            hr_user = CustomUser.objects.create(
                employee_id='100002',
                first_name='HR',
                surname='Person',
                pin='0000',
                is_hr=True,
                is_active=True
            )

        # Create or update employees
        employees = []
        for i in range(3):
            employee_id = f'20000{i+1}'
            try:
                emp = CustomUser.objects.get(employee_id=employee_id)
                # Update properties
                emp.first_name = f'Employee{i+1}'
                emp.surname = 'Test'
                emp.manager = manager
                emp.is_active = True
                emp.save()
            except CustomUser.DoesNotExist:
                emp = CustomUser.objects.create(
                    employee_id=employee_id,
                    first_name=f'Employee{i+1}',
                    surname='Test',
                    pin='0000',
                    manager=manager,
                    is_active=True,
                )
            employees.append(emp)

        # Clear existing leaves for these employees to avoid duplicates
        Leave.objects.filter(employee__in=employees).delete()

        # Create leave requests with different statuses
        today = timezone.now().date()

        # Pending leave
        Leave.objects.create(
            employee=employees[0],
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=7),
            reason="Family vacation",
            status='PENDING',
            leave_type=vacation
        )

        # Manager approved leave
        Leave.objects.create(
            employee=employees[1],
            start_date=today + timedelta(days=10),
            end_date=today + timedelta(days=12),
            reason="Medical appointment",
            status='APPROVED_BY_MANAGER',
            leave_type=sick
        )

        # HR approved leave
        Leave.objects.create(
            employee=employees[2],
            start_date=today + timedelta(days=15),
            end_date=today + timedelta(days=16),
            reason="Personal matters",
            status='APPROVED_BY_HR',
            leave_type=vacation
        )

        self.stdout.write(self.style.SUCCESS('Successfully created test data'))