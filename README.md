![# dyn-ip](https://raw.githubusercontent.com/nbaudet/dyn-ip/master/pub/logo-dyn-ip.png "dyn-ip logo")
## What this package does
Let this soft run on any machine on your local network, and it will update a file on your web server with your public IP through FTP.
It is useful when you have a dynamic IP address AND a webserver and don't want to use a dynDNS client.

## Installation
Prerequisite: you need to have Node.js and Git installed on your machine.

```bash
# Install app and dependencies
git clone https://github.com/nbaudet/dyn-ip.git
cd dyn-ip
npm install

# Configure execution
cp config.example.yml config.yml
# -> Now edit config.yml with nano or vim

# Execute just once
node app.js once
# Or launch the cron
node app.js
```

1. On your FTP server, create the folder where the files should be served, i.e. "dyn-ip".
2. Rename or copy `config.example.yml` to `config.yml` and set the correct FTP values. Set the path to the where you want the files to be uploaded, i.e. "dyn-ip". **Be careful not to overwrite an existing index.html file** by giving an existing path. The cron configuration follows this specification: http://crontab.org/

## Launch as a deamon
You must install `forever` globally
```bash
sudo npm install -g forever
```
Then launch the program with
```bash
forever start app.js
```

## Start at boot-time on a Raspberry Pi
First install the app, then install forever and finally write the following code at the end of `/etc/rc.local`
```bash
forever start ~/dyn-ip/app.js
```