from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('', views.login_view, name='login_page'),  # Login page
    path('login/', views.login_view, name='login'),  # Handles the login form submission
    path('user_page/', views.user_page, name='user_page'),  # Corrected to use views.user_page
    path('logout/', views.logout_view, name='logout'),
    path('clock_in/', views.clock_in_view, name='clock_in'),
    path('clock_out/', views.clock_out_view, name='clock_out'),
    path('get_todays_entries/', views.get_todays_entries, name='get_todays_entries'),
    path('custom_admin_page/', views.custom_admin_page, name='custom_admin_page'),
    path('upload_image/', views.upload_image, name='upload_image'),
    path('announcements/', views.announcements_list_create, name='announcements_list_create'),
    path('announcements/<int:pk>/', views.announcement_detail, name='announcement_detail'),
    path('announcements/<int:pk>/delete/', views.announcement_delete, name='announcement_delete'),
    path('announcements/<int:pk>/post/', views.announcement_post, name='announcement_post'),
    path('announcements/posted/', views.posted_announcements_list, name='posted_announcements_list'),
    path("superadmin/", views.superadmin_redirect, name="superadmin_redirect"),
    path("get_special_dates/", views.get_special_dates, name="get_special_dates"),
    path('attendance_list_json/', views.attendance_list_json, name='attendance_list_json'),
    path('dashboard-data/', views.dashboard_data, name='dashboard_data'),
    path('export_time_entries_by_date/', views.export_time_entries_by_date, name='export_time_entries_by_date'),
    path('export_time_entries_by_employee/', views.export_time_entries_by_employee, name='export_time_entries_by_employee'),
    path('get_logs/', views.get_logs, name='get_logs'),

]+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

