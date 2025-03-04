from django import forms
from .models import CustomUser, TimeEntry

class CustomUserCreationForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.instance.pk:  # Only for new users
            next_id = CustomUser.objects.get_next_employee_id()
            self.fields['employee_id'].initial = next_id
            self.fields['employee_id'].help_text = "Auto-generated ID. You can modify if needed."

    class Meta:
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
        user = super().save(commit=False)
        user.pin = "0000"  # Set default PIN
        if commit:
            user.save()
        return user

class TimeEntryForm(forms.ModelForm):
    class Meta:
        model = TimeEntry
        fields = ['user', 'time_in', 'time_out', 'is_late', 'image_path', 'hours_worked']
        widgets = {
            'hours_worked': forms.HiddenInput(),  # Hide hours_worked as it's calculated automatically
        }

    def save(self, commit=True):
        instance = super().save(commit=False)
        if instance.time_in and instance.time_out:
            delta = instance.time_out - instance.time_in
            instance.hours_worked = round(delta.total_seconds() / 3600, 2)
        if commit:
            instance.save()
        return instance
