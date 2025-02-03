from django.urls import path
from . import views

urlpatterns = [
    path('', views.login_view, name='index'),  # Login page
    path('login/', views.login_view, name='login'),  # Handles the login form submission
    path('user_page/', views.user_page, name='user_page'),  # Corrected to use views.user_page
    path('logout/', views.logout_view, name='logout'),
]
