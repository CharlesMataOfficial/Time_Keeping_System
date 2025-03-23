
# SFGC Time Keeping System

A comprehensive time keeping solution developed for SF Group of Companies, providing employee attendance tracking, leave management, and administrative controls.

## Initial Setup

### Requirements

- Python <= 3.11.x
- [mkcert](https://github.com/FiloSottile/mkcert)
- MySQL database

If hosted on the local network mkcert is required to generate SSL certificate (For HTTPS)

Once you have the requirements

```cmd
mkcert -install
mkcert localhost 127.0.0.1 ::1 PC_IP_ADDRESS
```

### Database Setup

Create a MySQL database for the application:

```cmd
:: Create the database (adjust username/password as needed)
mysql -u root -p -e "CREATE DATABASE agri_db;"
```

### Django Setup

Then open terminal to the django folder (where manage.py is located)

You would need to run the first three commands if on a new machine

The last two are for data migration

```cmd
:: Install requirements like django and others
pip install -r requirements.txt

:: Run when there are any changes to your models (which is basically the blueprint for the tables)
python manage.py makemigrations

:: Run when you need to sync the tables to the SQL database (you usually need to run makemigrations and migrate one after the other)
python manage.py migrate

:: Run when you are migrating from the legacy system (Previous OJT)
python manage.py migrate_from_legacy

:: Run when migrating from another Django database (add source database to settings.py first)
python manage.py migrate_between_django --source source_db
```

### Database Backups

If you need to create or restore database backups:

```cmd
:: Create a backup of your database
mysqldump -u root -p agri_db > agri_db_backup.sql

:: Restore from a backup
mysql -u root -p -e "DROP DATABASE IF EXISTS agri_db; CREATE DATABASE agri_db;"
mysql -u root -p agri_db < agri_db_backup.sql
```

### Create Superuser

Use this command to create a superuser:

```cmd
python manage.py createsuperuser
```

### Running the Application

Once requirements are satisfied, run

```cmd
python manage.py runsslserver IP_ADDRESS_HERE:8000 --certificate CERT_NAME.pem --key CERT_KEY_NAME.pem
:: You can use 0.0.0.0:8000 also
:: The CERT_NAME.pem and CERT_KEY_NAME.pem are the files outputted by the earlier mkcert command
```

Go to <https://IP-ADDRESS-HERE:8000/>

Default login is with employee ID and PIN (default PIN for new users is "0000").

Note that only users with the "guard" role are allowed to login to the user page

Users with the "staff" role are allowed to login to the user admin page

Users with the "superadmin" role are allowed to go to the superadmin dashboard through manage users in user admin page
