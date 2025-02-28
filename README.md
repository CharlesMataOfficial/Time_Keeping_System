# Requirements

- Python
- openSSL

If hosted on the local network openSSL required to generate SSL certificate (For HTTPS)

```cmd
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Then open terminal to the django folder (where manage.py is located)

```cmd
pip install -r requirements.txt
```

Once requirements are satisfied, run

```cmd
python manage.py runserver 0.0.0.0:8000 --cert-file cert.pem --key-file key.pem
```

Go to <https://IP-ADDRESS-HERE:8000/>
IF css is not loading, just hit ctrl + f5 to refresh the page
