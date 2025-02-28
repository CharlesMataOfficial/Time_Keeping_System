from django.shortcuts import redirect
from django.urls import reverse
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.admin.models import LogEntry


class BlockAdminAccessMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if the user is trying to access the admin page
        if request.path.startswith("/admin"):

            # Allow access if the user is an authenticated staff or superuser
            if request.user.is_authenticated and (
                request.user.is_staff or request.user.is_superuser
            ):
                return self.get_response(request)

            # Otherwise, redirect to the login page
            return redirect(
                reverse("login")
            )  # Adjust 'login' to your actual login page name

        return self.get_response(request)


@receiver(post_save, sender=LogEntry)
def log_admin_entries(sender, instance, created, **kwargs):
    """Log Django admin actions from LogEntry"""
    from .models import AdminLog  # Import locally to avoid circular import

    # Skip if this is a user action - already handled by direct logging
    if instance.content_type.model == 'customuser':
        return

    if instance.user.is_authenticated:
        action_flag = instance.action_flag
        action = None

        # Create a more readable description based on the action type
        if action_flag == 1:  # Addition
            action = 'admin_create'
            description = f"Added new {instance.content_type.model}: {instance.object_repr}"
        elif action_flag == 2:  # Change
            action = 'admin_update'
            description = f"Updated {instance.content_type.model}: {instance.object_repr}"
        elif action_flag == 3:  # Deletion
            action = 'admin_delete'
            description = f"Deleted {instance.content_type.model}: {instance.object_repr}"
        else:
            return  # Skip unknown action types

        if action:
            AdminLog.objects.create(
                user=instance.user,
                action=action,
                description=description,
                ip_address=None
            )
