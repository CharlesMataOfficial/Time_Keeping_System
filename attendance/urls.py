from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('', views.login_view, name='index'),  # Login page
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
]+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

