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

# -> Set the path in ´app.js´ at line 18, to the folder where dyn-ip is installed

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
1. First install the app, then install forever
2. Modify the `dyn-ip` file according to your settings, and your node version and directory. You can visit http://www.stuffaboutcode.com/2012/06/raspberry-pi-run-program-at-start-up.html for more help. You might find the command ´which forever´ useful.
3. Copy the file `dyn-ip` to `/etc/init.d` as administrator
4. Make the script executable with `sudo chmod 755 /etc/init.d/dyn-ip`
5. Test start your program with `sudo /etc/init.d/dyn-ip start`
6. Register your script to run at startup with `sudo update-rc.d dyn-ip defaults`

You can remove the script from startup with `sudo update-rc.d -f dyn-ip remove`
