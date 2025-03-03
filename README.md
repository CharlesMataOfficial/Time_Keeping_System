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

```cmd
pip install -r requirements.txt
```

Once requirements are satisfied, run

```cmd
python manage.py runsslserver IP_ADDRESS_HERE:8000 --certificate CERT_NAME.pem --key CERT_KEY_NAME.pem
:: You can use 0.0.0.0:8000 also
```

Go to <https://IP-ADDRESS-HERE:8000/>
IF css is not loading, just hit ctrl + f5 OR just f5 to refresh the page
