@echo off
cd "C:\Users\admin\Desktop\Time Keeping System\Time_Keeping_System"
call .\venv\Scripts\activate.bat
start python manage.py runserver 0.0.0.0:8000 --cert-file cert.pem --key-file key.pem


:: Please wait for the server to start
timeout /t 5