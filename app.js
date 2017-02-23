schedule = require('node-schedule');
yaml = require('js-yaml');
fs = require('fs');
const publicIp = require('public-ip');
var nodeFtp = require('ftp');

const defaultRedirect = {
    lastIp: '',
    log: []
};

// Get config Yaml content, or throw exception on error
function readYaml(fileName, killOnError) {
    killOnError = (typeof killOnError !== 'undefined') ? killOnError : true;
    try {
        return yaml.safeLoad(fs.readFileSync(fileName, 'utf8'));
    } catch (e) {
        if (e.code == 'ENOENT') {
            console.log("The file " + fileName + " does not exist.");
            if (fileName == "config.yml")
                console.log("Create one from 'config.example.yml'.");
        } else console.log(e);

        if (killOnError) process.exit();
    }
}

// Save content to yaml file
function writeYaml(fileName, content) {
    try {
        fs.writeFileSync(fileName, yaml.safeDump(content))
    } catch (e) {
        console.log(e);
    }
}

// Save content to json file
function writeJson(fileName, content) {
    try {
        fs.writeFileSync(fileName, JSON.stringify(content), 'utf8')
    } catch (e) {
        console.log(e);
    }
}

// Uploads the files to the server
function uploadFiles(config) {
    try {
        // List of files to upload
        var files = [{
            source: "pub/index.html",
            target: config.server.path + "/index.html"
        }, {
            source: "pub/redirect.json",
            target: config.server.path + "/redirect.json"
        }, {
            source: "pub/style.min.css",
            target: config.server.path + "/style.min.css"
        }, {
            source: "pub/logo-dyn-ip.png",
            target: config.server.path + "/logo-dyn-ip.png"
        }];

        var ftp = new nodeFtp();

        ftp.on('greeting', function(msg) {
            console.log("FTP server is greeting with:")
            console.log(msg);
        }).on('ready', function() {
            // TODO: Tests existence of destination folder and create it if needed
            // ...

            files.forEach(function(element) {
                ftp.put(element.source, element.target, function(err) {
                    if (err) throw err;
                    else console.log(element.source + " was uploaded to " + element.target);
                    ftp.end();
                });
            })
        });

        // Launch async uploads
        ftp.connect({
            host: config.server.host,
            user: config.server.username,
            password: config.server.password
        });
    } catch (e) {
        console.log(e);
    }
}

function main() {
    var history = readYaml('history.yml', false);
    history = (typeof history != undefined) ? history : defaultRedirect;

    // Get the public IP
    publicIp.v4({ https: true }).then(currentIp => {
        console.log('Current IP : ' + currentIp);

        // If there is a new IP...
        if (currentIp != history.lastIp) {
            console.log("Writing a new IP to config file and uploading...");

            history.log.unshift({ ip: currentIp, date: new Date() });
            history.lastIp = currentIp;

            // ... updates the history (local and public)
            writeYaml('history.yml', history);
            writeJson("pub/redirect.json", history);

            // ... and uploads the file
            uploadFiles(config);
        } else {
            console.log('Nothing to update');
        }
    });
}

var config = readYaml('config.yml');

//var rule = new schedule.RecurrenceRule();
//rule.minute = config.refreshTime;

var rule = '*/20 * * * * *'; // www.crontab.org

schedule.scheduleJob(rule, main());
