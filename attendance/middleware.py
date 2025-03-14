from django.shortcuts import redirect
from django.urls import reverse
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.admin.models import LogEntry


class BlockAdminAccessMiddleware:
    """
    Middleware to block unauthorized access to the admin page.
    """
    def __init__(self, get_response):
        """
        Initialize the middleware.

        Args:
            get_response: The next middleware or view to call.
        """
        self.get_response = get_response

    def __call__(self, request):
        """
        Process the request.

        If the user is trying to access the admin page and is not an authenticated
        staff or superuser, redirect them to the login page.

        Args:
            request: The HTTP request object.

        Returns:
            The HTTP response object.
        """
        if request.path.startswith("/admin"):
            if request.user.is_authenticated and (
                request.user.is_staff or request.user.is_superuser
            ):
                return self.get_response(request)

            return redirect(reverse("login"))

        return self.get_response(request)


@receiver(post_save, sender=LogEntry)
def log_admin_entries(sender, instance, created, **kwargs):
    """
    Log Django admin actions from LogEntry.

    This function is a receiver for the post_save signal of the LogEntry model.
    It creates an AdminLog entry for each admin action, excluding user actions.

    Args:
        sender: The model class that sent the signal (LogEntry).
        instance: The LogEntry instance being saved.
        created (bool): True if a new record was created.
        **kwargs: Additional keyword arguments.
    """
    from .models import AdminLog  # Import locally to avoid circular import

    if instance.content_type.model == 'customuser':
        return

    if instance.user.is_authenticated:
        action_flag = instance.action_flag
        action = None

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
            return

        if action:
            AdminLog.objects.create(
                user=instance.user,
                action=action,
                description=description,
                ip_address=None
            )