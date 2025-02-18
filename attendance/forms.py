from django import forms
from .models import CustomUser

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
