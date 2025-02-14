from django import forms
from .models import CustomUser

class CustomUserCreationForm(forms.ModelForm):
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
