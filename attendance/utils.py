"""
Utility functions and constants for the attendance app.
"""
import datetime

# Mapping: key is the code; value is a tuple (main, alias) that should match exactly what's stored in the database.
COMPANY_CHOICES = {
    'ASC': ('ASC', 'AgriDOM'),
    'SFGCI': ('SFGCI', 'SFGC'),
    'DJAS': ('DJAS', 'DSC'),
    'FAC': ('FAC',),  # only one value; no alias
    'GTI': ('GTI',),
    'SMI': ('SMI',),
}

# Company logo mapping
COMPANY_LOGO_MAPPING = {
    "sfgc": "sfgroup.png",
    "asc": "agridom4.png",
    "sfgci": "sfgroup.png",
    "smi": "sunfood.png",
    "gti": "geniustech.png",
    "fac": "farmtech.png",
    "djas": "djas.png",
    "agridom": "agridom4.png",
    "dsc": "djas.png",
    "default": "default_logo.png",

}

# Department mapping
DEPARTMENT_CHOICES = {
    'hr': "Human Resources",
    'it': "IT Department",
    'finance': "Finance",
    'sales': "Sales",
}

# Standard department list
STANDARD_DEPARTMENTS = [
    "Sales",
    "Operations - Mindanao",
    "Technical Services",
    "Support - Supply Management",
    "Sales - Mindanao",
    "Academy",
    "Office of the CEO",
    "Office of the COO",
    "Support - General Services",
    "Technical - SFGC",
    "Support - ICT",
    "Support - Admin",
    "Support - Finance",
    "Support - Admin - Luzon",
    "Support - HR",
    "Support - Supply",
    "Human Resources",
    "IT Department",
    "Finance",
]

# Remove duplicates from STANDARD_DEPARTMENTS
STANDARD_DEPARTMENTS = list(dict.fromkeys(STANDARD_DEPARTMENTS))

# Day code mapping
DAY_CODE_MAPPING = {
    0: "mon",
    1: "tue",
    2: "wed",
    3: "thu",
    4: "fri",
    5: "sat",
    6: "sun",
}

def get_day_code(date):
    """
    Convert a datetime object to a day code (mon, tue, etc.).

    Args:
        date (datetime): The datetime object to convert.

    Returns:
        str: The day code corresponding to the date.
    """
    return DAY_CODE_MAPPING[date.weekday()]

def format_minutes(minutes):
    """
    Format minutes to display lateness or earliness.

    Args:
        minutes (int): The number of minutes.

    Returns:
        str: A string indicating whether the time is 'X mins late', 'X mins early', or 'On time'.
    """
    if minutes > 0:
        return f"{minutes} mins late"
    elif minutes < 0:
        return f"{abs(minutes)} mins early"
    else:
        return "On time"

def get_company_logo(company_name):
    """
    Retrieve the company logo filename based on the company name.

    Args:
        company_name (str): The name of the company.

    Returns:
        str: The filename of the company logo.  Returns a default logo if the company name is not found.
    """
    if not company_name:
        return COMPANY_LOGO_MAPPING["default"]

    company_name = company_name.strip().lower()
    return COMPANY_LOGO_MAPPING.get(company_name, COMPANY_LOGO_MAPPING["default"])

def create_default_time_preset(day_code):
    """
    Create a default TimePreset object for a given day code.

    Args:
        day_code (str): The day code (e.g., 'mon', 'tue', 'wed').

    Returns:
        TimePreset: A TimePreset object with default values for the given day.
    """
    from .models import TimePreset  # Import here to avoid circular imports

    if day_code == "wed":  # Wednesday
        return TimePreset(
            name="Default Wednesday",
            start_time=datetime.time(8, 0),  # 8:00 AM
            end_time=datetime.time(17, 0),   # 5:00 PM
            grace_period_minutes=5
        )
    else:  # Mon, Tue, Thu, Fri, Sat, Sun
        return TimePreset(
            name="Default Weekday",
            start_time=datetime.time(8, 0),  # 8:00 AM
            end_time=datetime.time(19, 0),   # 7:00 PM
            grace_period_minutes=5
        )

def log_admin_action(request, action, description):
    """
    Log admin actions to the AdminLog model.

    Args:
        request (HttpRequest): The HTTP request object.
        action (str): The action performed by the admin.
        description (str): A description of the action.
    """
    from .models import AdminLog  # Import here instead of at the top level

    if request.user.is_authenticated:
        AdminLog.objects.create(
            user=request.user,
            action=action,
            description=description,
            ip_address=get_client_ip(request)
        )

def get_client_ip(request):
    """
    Get the client's IP address from the request.

    Args:
        request (HttpRequest): The HTTP request object.

    Returns:
        str: The client's IP address.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip