from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser
from django.core.exceptions import ValidationError

class CustomUserCreationForm(UserCreationForm):
    password1 = forms.CharField(
        label="PIN",
        widget=forms.PasswordInput,
        help_text="Enter a 4-digit PIN."
    )
    password2 = forms.CharField(
        label="PIN (Confirmation)",
        widget=forms.PasswordInput,
        help_text="Enter the same 4-digit PIN for verification."
    )

    class Meta:
        model = CustomUser
        fields = ("employee_id", "first_name", "surname", "birth_date", "company", "position", "date_hired")

    def clean_password1(self):
        password1 = self.cleaned_data.get("password1")
        if len(password1) != 4:
            raise ValidationError("PIN must be exactly 4 digits.")
        return password1

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        password2 = cleaned_data.get("password2")

        if password1 and password2 and password1 != password2:
            raise ValidationError({"password2": "Passwords do not match."})

        return cleaned_data

    def save(self, commit=True):
        # Ensure that the PIN is not hashed
        user = super().save(commit=False)
        user.pin = self.cleaned_data.get("password1")  # Save the plain PIN
        if commit:
            user.save()
        return user
