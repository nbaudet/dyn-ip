# dyn-ip
## What this package does
Let this soft run on any machine on your local network, and it will update a file on your web server with your public IP through FTP.
It is useful when you have a dynamic IP address AND a webserver and don't want to use a dynDNS client.

## Installation
Prerequisite: you need to have Node.js and Git installed on your machine.

```bash
git clone https://github.com/nbaudet/dyn-ip.git
cd dyn-ip
npm install
...
```
1. On your FTP server, create a folder where the files should be served, i.e. "dyn-ip".
2. Rename or copy `config.example.yml` to `config.yml` and set the correct FTP values. Set the path to the where you want the files to be uploaded, i.e. "dyn-ip". **Be careful not to overwrite an existing index.html file** by giving an existing path.

## Launch as a deamon
...

## Start at boot-time on a Raspberry Pi
...