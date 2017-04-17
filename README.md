![# dyn-ip](https://raw.githubusercontent.com/nbaudet/dyn-ip/master/pub/logo-dyn-ip.png "dyn-ip logo")
## What this package does
Let this soft run on any machine on your local network, and it will update a file on your web server with your public IP through FTP.
It is useful when you have a dynamic IP address AND a webserver and don't want to use a dynDNS client.

## Installation & configuration
Prerequisite: you need to have Node.js and Git installed on your machine.

```bash
# Install app and dependencies
git clone https://github.com/nbaudet/dyn-ip.git
cd dyn-ip
npm install
```

1. On your FTP server, create the folder where the files should be served, i.e. "dyn-ip".
2. With the second command below, open the file `config.yml` with nano and set the correct FTP values. Set the path to where you want the files to be uploaded, i.e. "dyn-ip". **Be careful not to overwrite an existing index.html file by giving a wrong path**. The cron configuration follows this specification: http://crontab.org/

```bash
# Configure execution
cp example.config.yml config.yml
# Now edit config.yml with nano or vim
nano config.yml
```

## Running
```bash
# Execute just once
node app.js once
# Execute once without logging
node app.js once nolog
# Or launch the cron
node app.js
```

## Start at boot-time on a Raspberry Pi
First install the app and its dependencies.

Then start dyn-ip at boot by editing your cron tasks:
```bash
crontab -e
```
Add the following lines at the end of the file:
```bash
# Starts dyn-ip at reboot and writes the launch time in startup.log
@reboot /usr/local/bin/node /home/<your user>/dyn-ip/app.js >> /home/<your user>/dyn-ip/startup.log &
```
*You might find the command `which node` useful to know where your node binary is located.*

If the command `crontab -e` does not open up your preferred editor, you might have to install it:
```bash
sudo apt-get update && apt-get install cron
```

## Check your log files
Check that the app started as a cron by opening `startup.log`. You should see a line whith the boot time.
Afterwards, the app will append the logs in `dyn-ip.log` and `error.log` in the app directory.