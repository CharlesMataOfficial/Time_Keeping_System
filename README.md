# Requirements

- Python <= 3.11.x
- [mkcert](https://github.com/FiloSottile/mkcert)

If hosted on the local network mkcert is required to generate SSL certificate (For HTTPS)

Once you have the requirements

```cmd
mkcert -install
mkcert localhost 127.0.0.1 ::1 PC_IP_ADDRESS
```

Then open terminal to the django folder (where manage.py is located)

You would need to run the first three commands if on a new machine

The last one is only needed if you want to migrate from your old system database

```cmd
:: Install requirements like django and others
pip install -r requirements.txt

:: Run when there are any changes to your models (which is basically the blueprint for the tables)
python manage.py makemigrations

:: Run when you need to sync the tables to the SQL database (you usually need to run makemigrations and migrate one after the other)
python manage.py migrate

:: Run when you have an old database that you are migrating from
python manage.py migrate_from_legacy
```

Once requirements are satisfied, run

```cmd
python manage.py runsslserver IP_ADDRESS_HERE:8000 --certificate CERT_NAME.pem --key CERT_KEY_NAME.pem
:: You can use 0.0.0.0:8000 also
:: The CERT_NAME.pem and CERT_KEY_NAME.pem are the files outputte by the earlier mkcert command
```

Go to <https://IP-ADDRESS-HERE:8000/>
IF css is not loading, just hit ctrl + f5 OR just f5 to refresh the page
>>>>>>> merge
