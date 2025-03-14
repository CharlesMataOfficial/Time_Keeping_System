:: This bat script is intended to make running the server easier
:: You still need to do the things in README.MD
:: You also need to edit the things here such as the IP address, cd path, etc.
@echo off
cd "C:\Path\To\The\System"
start python manage.py runsslserver IP_ADDRESS_HERE:8000 --certificate CERT_NAME.pem --key CERT_KEY_NAME.pem


:: Please wait for the server to start
timeout /t 5