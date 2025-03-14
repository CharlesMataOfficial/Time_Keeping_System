from django import forms
from .models import CustomUser, TimeEntry

class CustomUserCreationForm(forms.ModelForm):
    """
    Form for creating a new CustomUser.
    """
    def __init__(self, *args, **kwargs):
        """
        Initialize the form.

        If creating a new user, pre-populate the employee_id field with the next available ID.
        """
        super().__init__(*args, **kwargs)
        if not self.instance.pk:
            next_id = CustomUser.objects.get_next_employee_id()
            self.fields['employee_id'].initial = next_id
            self.fields['employee_id'].help_text = "Auto-generated ID. You can modify if needed."

    class Meta:
        """
        Meta class to define the model and fields used in the form.
        """
        model = CustomUser
        fields = (
            "employee_id",
            "first_name",
            "surname",
            "birth_date",
            "company",
            "position",
            "date_hired"
        )

    def save(self, commit=True):
        """
        Save the form.

        Sets a default PIN for the new user.
        """
        user = super().save(commit=False)
        user.pin = "0000"
        if commit:
            user.save()
        return user

class TimeEntryForm(forms.ModelForm):
    """
    Form for creating and updating TimeEntry objects.
    """
    class Meta:
        """
        Meta class to define the model, fields, and widgets used in the form.
        """
        model = TimeEntry
        fields = ['user', 'time_in', 'time_out', 'is_late', 'image_path', 'hours_worked']
        widgets = {
            'hours_worked': forms.HiddenInput(),
        }

    def save(self, commit=True):
        """
        Save the form.

        Calculates hours_worked based on time_in and time_out.
        """
        instance = super().save(commit=False)
        if instance.time_in and instance.time_out:
            delta = instance.time_out - instance.time_in
            instance.hours_worked = round(delta.total_seconds() / 3600, 2)
        if commit:
            instance.save()
        return instance